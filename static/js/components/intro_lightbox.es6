import * as React from "react"
let {PropTypes: types} = React;

import Lightbox from "st/components/lightbox"
import MidiSelector from "st/components/midi_selector"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"

export default class IntroLightbox extends Lightbox {
  static className = "intro_lightbox"

  static propTypes = {
    midi: types.object,
    setInput: types.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  close() {
    if (this.state.selectedInput != null) {
      this.props.setInput(this.state.selectedInput)
    }

    super.close()
  }

  midiInputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.inputs.values()]
  }

  renderContent() {
    let midiSetup

    if (this.props.midi) {
      midiSetup = <div>
        <h4>Select MIDI input device:</h4>
        <MidiSelector
          selectedInput={(idx) => {
            this.setState({selectedInput: idx})
          }}
          midiOptions={this.midiInputs()} />
        <div className="input_row">
          <label>
            <input type="checkbox" />
            {" "}
            <span className="label">Forward midi input to output</span>
          </label>
        </div>
        <h4>Select MIDI output device:</h4>
        <p>A MIID output device is only used for play along & ear training mode.</p>

        <MidiInstrumentPicker
          midi={this.props.midi}
          onPick={midiChannel => {
            this.setState({
              metronome: midiChannel.getMetronome(),
              midiChannel})
            trigger(this, "closeLightbox")
          }}
        />

      </div>
    } else {
      midiSetup = <p>MIDI support not detected on your computer. You'll only be able to use the on-srcreen keyboard.</p>
    }

    return <div>
      <h2>Sight reading trainer</h2>
      <p>This tool gives you a way to practice sight reading randomly
      generated notes. It works best with Chrome and a MIDI keyboard
      plugged into your computer.</p>

      <p>You can customize how the notes are generated, and what staff you
      use from the settings menu.</p>

      {midiSetup}

      <p>
        <button onClick={this.close.bind(this)}>Continue</button>
      </p>
    </div>
  }

}

