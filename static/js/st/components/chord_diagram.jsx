import * as React from "react"
import {useDiagramSize, diagramWidth} from "st/diagram_size"
import Toast from "st/components/toast"
import {diagramNote, diagramRange, diagramTones, copyChordDiagram, FRET_MARKERS} from "st/chord_diagram_data"
import {STRING_NAMES} from "st/guitar_chords"
import styles from "./guitar_visuals.module.css"

export default function ChordDiagram({frets, fingers, name = "Guitar chord", labels = "fingers", caption = false}) {
  const zoom = useDiagramSize()
  const spacing = labels === "both" ? 42 : 28
  const left = 35
  const right = left + 5 * spacing
  const [message, setMessage] = React.useState(null)
  const {start, rows} = diagramRange(frets)
  const tones = diagramTones(name, frets)
  const copy = async (event, format) => {
    const menu = event.currentTarget.closest("details")
    menu.open = false
    menu.querySelector("summary").focus()
    try { await copyChordDiagram(frets, name, format); setMessage("Diagram copied") }
    catch { setMessage("Could not copy. Allow clipboard access and try again.") }
  }
  const bottom = 50 + rows * spacing
  const summary = frets.map((fret, index) => `${STRING_NAMES[index]} ${fret === null ? "muted" : fret === 0 ? "open" : `fret ${fret}${fingers?.[index] ? ` finger ${fingers[index]}` : ""}`}`).join(", ")
  return <figure className={styles.diagram} style={{width: diagramWidth(zoom) * (labels === "both" ? 4 / 3 : 1)}}>
    <details className={styles.copy_menu}>
      <summary aria-label="Copy chord diagram" title="Copy as">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></svg>
      </summary>
      <div role="group" aria-label="Copy as"><span>Copy as</span><button type="button" onClick={event => copy(event, "block")}>Block</button><button type="button" onClick={event => copy(event, "line")}>Line</button></div>
    </details>
    <svg viewBox={`0 0 ${right + 35} ${bottom + 30}`} role="img" aria-label={`${name}: ${summary}`}>
      <title>{`${name}: ${summary}`}</title>
      {Array.from({length: rows + 1}, (_, row) => <line key={`f${row}`} x1="35" x2={right}
        y1={50 + row * spacing} y2={50 + row * spacing} stroke="currentColor" strokeWidth={row === 0 && start === 1 ? 6 : 2} />)}
      {[1, 2, 3, 4].map(finger => {
        const strings = frets.map((fret, index) => ({fret, index})).filter(({fret, index}) => fret > 0 && fingers?.[index] === finger)
        if (strings.length < 2 || strings.some(({fret}) => fret !== strings[0].fret)) return null
        const y = 50 + (strings[0].fret - start + .5) * spacing
        return <line key={`barre${finger}`} x1={35 + strings[0].index * spacing} x2={35 + strings.at(-1).index * spacing}
          y1={y} y2={y} stroke="currentColor" strokeWidth={labels === "both" ? 38 : 26} strokeLinecap="round" />
      })}
      {frets.map((fret, index) => {
        const x = 35 + index * spacing
        const {note, interval} = fret === null ? {} : diagramNote(fret, index, tones)
        const text = labels === "fingers" ? fingers?.[index] : labels === "notes" ? note : labels === "intervals" ? interval : note
        const y = 50 + (fret - start + .5) * spacing
        return <g key={index}>
          <line x1={x} x2={x} y1="50" y2={bottom} stroke="currentColor" strokeWidth="1.5" />
          <text x={x} y={bottom + 22} textAnchor="middle" fill="currentColor" fontSize="18">{["E", "A", "D", "G", "B", "e"][index]}</text>
          {fret === null ? <text x={x} y="35" textAnchor="middle" fill="currentColor" fontSize="23">×</text>
            : fret === 0 ? <><circle cx={x} cy="28" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                {labels !== "fingers" && <text x={x} y="12" textAnchor="middle" fill="currentColor" fontSize="18">{labels === "both" ? `${note} ${interval}` : text}</text>}</>
              : <>
                <circle cx={x} cy={50 + (fret - start + .5) * spacing} r={labels === "both" ? 20 : 14} fill="currentColor" />
                {text && <text x={x} y={labels === "both" ? y - 2 : y + 6} textAnchor="middle"
                  className={styles.finger} fontSize="18" fontWeight="700">{text}</text>}
                {labels === "both" && <text x={x} y={y + 16} textAnchor="middle" className={styles.finger} fontSize="18">{interval}</text>}
              </>}
        </g>
      })}
      {Array.from({length: rows}, (_, row) => start + row).filter(fret => FRET_MARKERS.includes(fret)).map(fret =>
        <text key={`label${fret}`} x="4" y={50 + (fret - start + .5) * spacing + 6} fill="currentColor" fontSize="18">{fret}</text>)}
    </svg>
    {caption && <figcaption>{name}</figcaption>}
    <Toast message={message} onDismiss={() => setMessage(null)} />
  </figure>
}
