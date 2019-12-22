import * as React from "react"
import * as types from "prop-types"

import Lightbox from "st/components/lightbox"
import MidiSelector from "st/components/midi_selector"
import MidiInstrumentPicker from "st/components/midi_instrument_picker"
import Select from "st/components/select"
import {MidiChannel} from "st/midi"

export default class DevicePickerLightbox extends Lightbox {
  static className = "device_picker_lightbox"

  static propTypes = {
    midi: types.object,
  }

  constructor(props) {
    super(props)
    this.state = {
      selectedInput: this.props.selectedInputIdx,
      selectedOutput: this.props.selectedOutputIdx,
      outputDeviceType: this.props.selectedOutputDeviceType,
      forwardMidi: this.props.forwardMidi || false,
    }

    this.instrumentPickerRef = React.createRef()
  }

  midiConfiguration() {
    let instrumentPicker = this.instrumentPickerRef.current

    return {
      forwardMidi: this.state.forwardMidi,
      inputIdx: this.state.selectedInput,
      outputIdx: instrumentPicker ? instrumentPicker.getSelectedIdx() : null,
      outputChannel: instrumentPicker ? instrumentPicker.getCurrentChannel() : null,
      outputDeviceType: this.state.outputDeviceType,
    }
  }

  midiInputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.inputs.values()]
  }

  renderOutputPicker() {
    let outputDetails

    if (this.state.outputDeviceType == "midi") {
      let channel = this.props.selectedOutputChannel

      // don't let sample output go into midi picker
      if (!(channel instanceof MidiChannel)) {
        channel = null
      }

      outputDetails = <MidiInstrumentPicker
        midi={this.props.midi}
        defaultChannel={channel}
        ref={this.instrumentPickerRef}
      />
    }

    let devices = [
      {value: "internal", name: "Internal piano"},
      {value: "none", name: "None"},
    ]

    if (this.props.midi) {
      devices.push({value: "midi", name: "MIDI Device"})
    }

    return <section>
      <h4>Select Output Device</h4>
      <p>Used for the on-screen keyboard, ear training, and play-along mode.</p>
      <div className="input_row device_type_picker">
        <span className="label">Output type</span>
        {" "}
        <Select
          value={this.state.outputDeviceType}
          onChange={(value) => this.setState({outputDeviceType: value})}
          options={devices}
        />
      </div>

      {outputDetails}
    </section>
  }

  renderContent() {
    let midiSetup

    if (this.props.midi) {
      midiSetup = <div>
        <h4>Select MIDI input device</h4>
        <p>An input device will allow you to play notes and chords on your
        keyboard into this website.</p>

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
      </div>
    } else {
      midiSetup = <div>
        <h4>Select MIDI input device</h4>
        <p><strong>MIDI support not detected on your computer.</strong> You'll only be able to use the on-srcreen keyboard and build in synthesizer. (Try Chrome for MIDI device support)</p>
      </div>

    }

    return <div>
      <h2>Device Setup</h2>

      {midiSetup}
      {this.renderOutputPicker()}

      <p>
        <button onClick={this.close.bind(this)}>Save selections</button>
      </p>
    </div>
  }

}

