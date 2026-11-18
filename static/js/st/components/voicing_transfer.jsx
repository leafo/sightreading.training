import * as React from "react"
import {ActionIcon} from "./control_icons"
import {Link} from "react-router-dom"
import {voicingToken} from "st/voicing_markup"
import styles from "./guitar_visuals.module.css"

// The portable token carries the actual frets; no catalog identifier can drift.
export default function VoicingTransfer({name, frets}) {
  let token
  try { token = voicingToken(name, frets) } catch { return null }
  const label = `Add ${name} to Chord Sheet`
  return <Link className={styles.diagram_link} aria-label={label} title={label} reloadDocument to={`/chord-sheet?voicing=${encodeURIComponent(token)}`}>
    <ActionIcon name="sheet" size={16} />
  </Link>
}
