import * as React from "react"

import MidiSelector from "st/components/midi_selector"
import Slider from "st/components/slider"
import Select from "st/components/select"

import {MidiChannel} from "st/midi"

let {PropTypes: types} = React

export default class MidiInstrumentPicker extends React.PureComponent {
  static propTypes = {
    midi: types.object.isRequired
  }

  constructor(props) {
    super(props)
    this.state = {
      outInputIdx: null,
      outChannel: 0,
      outInstrument: 0,
    }
  }

  render() {
    return <div className="midi_instrument_picker_component">
      <div className="midi_options">
        <label>
          <span>Channel</span>
          <Slider
            min={1}
            max={16}
            onChange={(value) => {
              this.setState({outChannel: value - 1})
            }}
            value={this.state.outChannel + 1} />
          <span>{this.state.outChannel + 1}</span>
        </label>
        <label>
          <span>Instrument</span>
          <Select
            value={this.state.outInstrument}
            onChange={v => this.setState({ outInstrument: v})}
            options={[
              { name: "Piano", value: 0 },
              { name: "Celesta", value: 8 },
              { name: "Organ", value: 16 },
              { name: "Guitar", value: 24 },
              { name: "Acoustic Bass", value: 32 },
              { name: "Violin", value: 40 },
              { name: "String Ensamble", value: 48 },
              { name: "Trumpet", value: 56 },
              { name: "Sax", value: 64 },
              { name: "Piccolo", value: 72 },
              { name: "Square Synth", value: 80 },
              { name: "Pad", value: 88 },
              { name: "Brightness", value: 100 },
            ]}/>
        </label>
      </div>

      <MidiSelector
        selectedInput={idx => this.setState({ outInputIdx: idx })}
        midiOptions={this.midiOutputs()} />

      <div className="midi_instrument_test_buttons">
        <button
          onClick={e => {
            e.preventDefault()
            this.getCurrentChannel().testNote()
          }}
          disabled={this.state.outInputIdx == null}>Play test note</button>
      </div>
    </div>
  }

  getCurrentChannel() {
    if (this.state.outInputIdx == null || this.state.outInstrument == null) {
      return null
    }

    let output = this.midiOutputs()[this.state.outInputIdx]
    let channel = new MidiChannel(output, this.state.outChannel)
    channel.setInstrument(this.state.outInstrument)
    return channel
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }

}
