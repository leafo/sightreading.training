import * as React from "react"
import styles from "./midi_instrument_picker.module.css"

import MidiSelector from "st/components/midi_selector"
import Slider from "st/components/slider"
import Select from "st/components/select"

import {MidiChannel} from "st/midi"

import * as types from "prop-types"

export default class MidiInstrumentPicker extends React.PureComponent {
  static propTypes = {
    midi: types.object.isRequired,
    defaultChannel: types.object,
  }

  constructor(props) {
    super(props)
    this.state = {
      outputIdx: null,
      outChannel: 0,
      outInstrument: 0,
    }

    let c = this.props.defaultChannel
    if (c) {
      this.state.outChannel = c.channel
      this.state.outInstrument = c.lastProgramNumber
      this.midiOutputs().map((output, idx) => {
        if (output == c.output) {
          this.state.outputIdx = idx
        }
      })
    }
  }

  render() {
    return <div className={styles.midi_instrument_picker_component}>
      <div className={styles.midi_options}>
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
        defaultIdx={this.state.outputIdx}
        onChange={idx => this.setState({ outputIdx: idx })}
        midiOptions={this.midiOutputs()} />

      <div className="midi_instrument_test_buttons">
        <button
          onClick={e => {
            e.preventDefault()
            this.getCurrentChannel().testNote()
          }}
          disabled={this.state.outputIdx == null}>Play test note</button>
      </div>
    </div>
  }

  getCurrentChannel() {
    if (this.state.outputIdx == null || this.state.outInstrument == null) {
      return null
    }

    let output = this.midiOutputs()[this.state.outputIdx]
    let channel = new MidiChannel(output, this.state.outChannel)
    channel.setInstrument(this.state.outInstrument)
    return channel
  }

  getSelectedIdx() {
    return this.state.outputIdx
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }

}
