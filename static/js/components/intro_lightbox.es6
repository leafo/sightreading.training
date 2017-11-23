import * as React from "react"
import * as types from "prop-types"

import Lightbox from "st/components/lightbox"
import MidiSelector from "st/components/midi_selector"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"

export default class IntroLightbox extends Lightbox {
  static className = "intro_lightbox"

  static propTypes = {
    midi: types.object,
  }

  constructor(props) {
    super(props)
    this.state = {
      selectedInput: this.props.selectedInputIdx,
      selectedOutput: this.props.selectedOutputIdx,
      forwardMidi: this.props.forwardMidi || false,
    }
  }

  midiConfiguration() {
    return {
      forwardMidi: this.state.forwardMidi,
      inputIdx: this.state.selectedInput,
      outputIdx: this.refs.instrumentPicker.getSelectedIdx(),
      outputChannel: this.refs.instrumentPicker.getCurrentChannel(),
    }
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
          defaultIdx={this.state.selectedInput}
          onChange={idx => this.setState({ selectedInput: idx })}
          midiOptions={this.midiInputs()} />
        <div className="input_row">
          <label>
            <input
              onChange={e => this.setState({forwardMidi: e.target.checked })}
              type="checkbox" checked={this.state.forwardMidi}
            />
            {" "}
            <span className="label">Forward MIDI input to output</span>
          </label>
        </div>
        <h4>Select MIDI output device:</h4>
        <p>A MIID output device is only used for play along & ear training mode.</p>

        <MidiInstrumentPicker
          midi={this.props.midi}
          defaultChannel={this.props.selectedOutputChannel}
          ref={"instrumentPicker"}
        />

      </div>
    } else {
      midiSetup = <p>
        MIDI support not detected on your computer. You'll only be able to use
      the on-srcreen keyboard.
        </p>
    }

    return <div>
      <h2>Select MIDI device</h2>
      <p>This tool works best with Chrome and a MIDI keyboard
      plugged into your computer.</p>

      {midiSetup}

      <p>
        <button onClick={this.close.bind(this)}>Save selections</button>
      </p>
    </div>
  }

}

