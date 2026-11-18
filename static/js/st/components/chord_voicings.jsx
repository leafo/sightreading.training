import * as React from "react"
import {IconChordLab, IconVoicings} from "./control_icons"
import visualStyles from "./guitar_visuals.module.css"
import {Link} from "react-router-dom"
import {useDiagramSize, diagramWidth} from "st/diagram_size"
import VoicingTransfer from "st/components/voicing_transfer"
import ChordDiagram, {DiagramAction} from "st/components/chord_diagram"
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
      return <section key={category}><h3>{category} voicings</h3><div className={styles.shapes} style={{gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${diagramWidth(zoom)}px), 1fr))`}}>
        {group.map(shape => <div className={styles.shape} key={shape.frets.join(",")}>
          <ChordDiagram {...shape} name={name} labels={labels} actions={<>
            {onChoose && <DiagramAction label={`Use ${name} voicing`} onClick={() => onChoose(shape.frets)}><IconVoicings /></DiagramAction>}
            {linkToLab && <Link className={visualStyles.diagram_link} aria-label={`Open ${name} in Chord Lab`} title={`Open ${name} in Chord Lab`} to={`/chord-lab?frets=${shape.frets.map(fret => fret ?? "x").join(",")}`}><IconChordLab /></Link>}
            <VoicingTransfer name={name} frets={shape.frets} />
          </>} />
          {shape.omittedFifth && <small>no 5</small>}
        </div>)}
      </div></section>
    })}
  </div>
}
