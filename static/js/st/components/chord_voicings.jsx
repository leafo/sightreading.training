import * as React from "react"
import {Link} from "react-router-dom"
import {useDiagramSize, diagramWidth} from "st/diagram_size"
import ChordDiagram from "st/components/chord_diagram"
import {guitarChordVoicings} from "st/guitar_chords"
import styles from "./chord_voicings.module.css"

export default function ChordVoicings({notes, bassNote, name, onChoose, linkToLab = false, labels = "fingers"}) {
  const zoom = useDiagramSize()
  const shapes = React.useMemo(() => guitarChordVoicings(notes, 24, bassNote), [notes.join(","), bassNote])
  if (!shapes.length) return <p>No compact voicing found for this chord and bass.</p>
  return <div className={styles.groups}>
    {["Common", "Moveable", "Less common"].map(category => {
      const group = shapes.filter(shape => shape.category === category)
      if (!group.length) return null
      return <section key={category}><h3>{category} voicings</h3><div className={styles.shapes} style={{gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${diagramWidth(zoom) * (labels === "both" ? 4 / 3 : 1) + 28}px), 1fr))`}}>
        {group.map(shape => <div className={styles.shape} key={shape.frets.join(",")}>
          <ChordDiagram {...shape} name={name} labels={labels} />
          {shape.omittedFifth && <small>no 5</small>}
          {onChoose && <button type="button" onClick={() => onChoose(shape.frets)}>Use</button>}
          {linkToLab && <Link to={`/chord-lab?frets=${shape.frets.map(fret => fret ?? "x").join(",")}`}>Analyze</Link>}
        </div>)}
      </div></section>
    })}
  </div>
}
