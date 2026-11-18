import * as React from "react"
import {IconChordLab, IconVoicings} from "st/components/control_icons"
import {searchChords} from "st/chord_reference"
import {guitarChordVoicings, assignFingers} from "st/guitar_chords"
import {parseChordSheet, exportChordSheet} from "st/chord_sheet"
import {readDefinitions, addDefinition, putDefinition, fretText, parseFrets, voicingToken, ALIAS_PATTERN} from "st/voicing_markup"
import ChordDiagram, {DiagramAction} from "st/components/chord_diagram"
import styles from "./pages/chord_sheet_page.module.css"

export default function SheetVoicings({source, shift, flats, activeChord, onActiveChord, onChange, onInsert, onLab, onClose}) {
  const [filter, setFilter] = React.useState("all")
  const [error, setError] = React.useState("")
  const [custom, setCustom] = React.useState("")
  const [label, setLabel] = React.useState("custom")
  const closeButton = React.useRef(null)
  React.useEffect(() => { closeButton.current?.focus() }, [])
  let normalized, transposeError
  try { normalized = exportChordSheet(source, shift, flats) }
  catch (e) { normalized = source; transposeError = e.message }
  const {definitions, errors} = readDefinitions(normalized)
  const segments = parseChordSheet(source, shift, flats).flat()
  const names = [...new Set([...segments.map(s => s.chord).filter(Boolean), ...definitions.map(d => d.name)])]
  const name = names.includes(activeChord) ? activeChord : names[0]
  const selected = definitions.filter(d => d.name === name)
  const chord = name && (searchChords(name).find(c => c.symbol === name) || searchChords(name)[0])
  const candidates = React.useMemo(() => chord ? guitarChordVoicings(chord.notes, 24, name.split("/")[1] || chord.notes[0]) : [], [name])
  const shapes = [...candidates]
  selected.forEach(d => { if (!shapes.some(s => fretText(s.frets) === fretText(d.frets))) shapes.unshift({...d, fingers: assignFingers(d.frets), category: "Custom"}) })
  segments.filter(s => s.chord === name && s.voicing?.frets).forEach(s => {
    if (!shapes.some(shape => fretText(shape.frets) === fretText(s.voicing.frets))) shapes.unshift({frets: s.voicing.frets, fingers: assignFingers(s.voicing.frets), category: "From lyrics"})
  })
  const change = next => { setError(""); onChange(next) }
  const remove = d => {
    if (parseChordSheet(normalized).flat().some(s => s.voicing?.alias === d.alias && s.chord === d.name)) {
      setError(`“${d.alias}” is used in the lyrics. Change those references before removing it.`); return
    }
    change(normalized.split("\n").filter((_, i) => i !== d.lineIndex).join("\n"))
  }
  const reorder = (from, to) => {
    if (from < 0 || to < 0 || from >= selected.length || to >= selected.length || from === to) return
    const ordered = [...selected]
    ordered.splice(to, 0, ordered.splice(from, 1)[0])
    const lines = normalized.split("\n"), original = [...lines]
    selected.forEach((d, index) => { lines[d.lineIndex] = original[ordered[index].lineIndex] })
    change(lines.join("\n"))
  }
  const move = (d, direction) => reorder(selected.indexOf(d), selected.indexOf(d) + direction)
  const rename = (d, alias) => {
    try {
      if (!ALIAS_PATTERN.test(alias)) throw new Error("Use 1–24 letters, numbers, underscores or hyphens; start with a letter.")
      if (alias === d.alias) return
      if (selected.some(s => s.alias === alias)) throw new Error("That label is already in use.")
      const lines = normalized.split("\n")
      lines[d.lineIndex] = `{voicing: ${name}:${alias} = ${fretText(d.frets)}}`
      change(lines.join("\n").replaceAll(`[${name}:${d.alias}]`, `[${name}:${alias}]`))
    } catch (e) { setError(e.message) }
  }
  return <aside id="sheet-voicing-panel" className={styles.voicingPanel} aria-label="Sheet voicings" onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); onClose() } }}>
    <div className={styles.modalHeading}><h2>Sheet voicings</h2><button ref={closeButton} type="button" onClick={onClose} aria-label="Close voicings">×</button></div>
    <div className={styles.chordTabs} role="group" aria-label="Choose chord">
      {names.map(n => <button type="button" key={n} aria-pressed={n === name} onClick={() => { onActiveChord(n); setError("") }}>{n} · {definitions.filter(d => d.name === n).length || "Auto"}</button>)}
    </div>
    {!name && <p>Add bracketed chords in Create to choose voicings.</p>}
    {transposeError && <p role="alert">{transposeError} Reset Transpose to Original key to edit these shapes.</p>}
    {errors.map(e => <p key={e.lineIndex} role="alert">{e.message}</p>)}
    {error && <p role="alert">{error}</p>}
    {name && <fieldset disabled={!!transposeError} className={styles.voicingFieldset}>
      <legend>{name}</legend><p>Select one or more shapes for this sheet. Frets: low E → high e, standard tuning.</p>
      {shift !== 0 && !transposeError && <p>Editing a shape will write the sheet in this displayed key.</p>}
      <div className={styles.chordTabs} role="group" aria-label="Filter voicings">
        {["all", "open", "barre"].map(f => <button type="button" key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
      </div>
      <div className={styles.voicingGrid}>
        {shapes.filter(s => filter === "all" || filter === "open" && s.frets.includes(0) || filter === "barre" && s.fingers?.some((f, i, a) => f && a.indexOf(f) !== i)).map(shape => {
          const key = fretText(shape.frets), match = selected.find(d => fretText(d.frets) === key)
          const used = segments.some(s => s.chord === name && s.voicing?.frets && fretText(s.voicing.frets) === key)
          return <div className={styles.voicingCard} key={key}>
            <ChordDiagram {...shape} name={name} caption={match?.alias ? `${name} · ${match.alias}` : true} actions={<>
              <DiagramAction label={`${match ? "Remove" : "Select"} ${name} voicing ${key}`} aria-pressed={!!match} onClick={() => match ? remove(match) : change(addDefinition(normalized, name, shape.frets).source)}><IconVoicings /></DiagramAction>
              <DiagramAction label={`Open ${name} in Chord Lab`} onClick={() => onLab(name, shape.frets, match?.alias)}><IconChordLab /></DiagramAction></>} /><code>{key}</code>{used && <small>Used in lyrics</small>}
          </div>
        })}
      </div>
      {!shapes.length && <p>No catalog shapes found. Paste an exact shape below or explore in Chord Lab.</p>}
      <details><summary>Add custom shape</summary>
        <label>Label<input value={label} maxLength={24} onChange={e => setLabel(e.target.value)} /></label>
        <label>Six frets<input value={custom} placeholder="x-3-2-3-1-x" onChange={e => setCustom(e.target.value)} /></label>
        <button type="button" onClick={() => { try {
          if (selected.some(d => d.alias === label)) throw new Error("That label already exists. Choose a new label.")
          change(putDefinition(normalized, name, label, parseFrets(custom)))
        } catch (e) { setError(e.message) } }}>Add shape</button>
      </details>
      <h3>On this sheet · {selected.length || "Auto"}</h3>
      {!selected.length && <p>Plain chords use an automatic diagram until you select a shape. Exact shapes written in lyrics are always included.</p>}
      {selected.map((d, i) => <div className={styles.selectedVoicing} key={`${name}:${d.alias}`}
        onDragOver={e => e.preventDefault()} onDrop={e => {
          e.preventDefault()
          reorder(selected.findIndex(item => item.key === e.dataTransfer.getData("text/plain")), i)
        }}>
        <label>Label<input key={d.alias} defaultValue={d.alias} maxLength={24} onBlur={e => rename(d, e.target.value)} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur() }} /></label>
        <code>{fretText(d.frets)}</code>
        <div><button type="button" draggable aria-label={`Drag ${d.alias} to reorder`} title="Drag to reorder"
          onDragStart={e => { e.dataTransfer.setData("text/plain", d.key); e.dataTransfer.effectAllowed = "move" }}>↕</button>
          <button type="button" disabled={!i} aria-label={`Move ${d.alias} up`} onClick={() => move(d, -1)}>↑</button>
          <button type="button" disabled={i === selected.length - 1} aria-label={`Move ${d.alias} down`} onClick={() => move(d, 1)}>↓</button>
          <button type="button" onClick={() => onInsert(`[${name}:${d.alias}]`, normalized)}>Insert into lyrics</button>
          <button type="button" onClick={() => remove(d)}>Remove</button></div>
      </div>)}
      {(selected[0] || candidates[0]) && <p><code>{voicingToken(name, (selected[0] || candidates[0]).frets)}</code> also works when pasted directly into lyrics.</p>}
    </fieldset>}
  </aside>
}
