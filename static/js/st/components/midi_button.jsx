
import * as React from "react"

import styles from "./midi_button.module.css"

export default function MidiButton(props) {
  return <button
    onClick={(e) => {
      e.preventDefault()
      props.pickMidi()
    }}
    className={styles.midi_button}>
      <div>
        <span className={styles.midi_label}>MIDI</span>
        <span className={styles.current_input_name}>
          {props.midiInput ? props.midiInput.name : "Select device"}
        </span>
      </div>
  </button>
}


