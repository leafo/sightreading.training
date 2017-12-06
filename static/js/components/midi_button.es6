export default function MidiButton(props) {
  return <button
    onClick={(e) => {
      e.preventDefault()
      props.pickMidi()
    }}
    className="midi_button">
      <div>
        <img src="/static/svg/midi.svg" alt="MIDI" />
        <span className="current_input_name">
          {props.midiInput ? props.midiInput.name : "Select device"}
        </span>
      </div>
  </button>
}

