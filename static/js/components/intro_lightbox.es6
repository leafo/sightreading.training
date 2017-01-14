import * as React from "react"
let {PropTypes: types} = React;

import Lightbox from "st/components/lightbox"
import MidiSelector from "st/components/midi_selector"

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
        <h4>Select your MIDI device:</h4>
        <MidiSelector
          selectedInput={(idx) => {
            this.setState({selectedInput: idx})
          }}
          midiOptions={this.midiInputs()} />
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

