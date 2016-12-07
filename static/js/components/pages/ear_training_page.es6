let {Link} = ReactRouter

class EarTrainingPage extends React.Component {
  componentDidMount() {
    N.setTitle("Register Account")
  }

  constructor(props) {
    super(props)

    this.state = {
      midiOut: null
    }
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }

  render() {
    return <div className="ear_training_page">
      {this.renderMidiPicker()}
    </div>
  }

  renderMidiPicker() {
    if (!this.props.midi) {
      return
    }

    return <div className="choose_device">
      <h3>Choose a MIDI output device</h3>
      <MidiSelector
        selectedInput={(idx) => {
          let output = this.midiOutputs()[idx]
          new MidiChannel(output, 0).testNote()

        }}
        midiOptions={this.midiOutputs()} />
    </div>
  }

  midiNoteOn(channel, pitch, velocity) {
    if (channel > 15) {
      throw "channel too big"
    }

    return [
      9 << 4 + channel,
      pitch,
      velocity
    ]
  }

  midiNoteOff(channel, pitch) {
    if (channel > 15) {
      throw "channel too big"
    }

    return [
      8 << 4 + channel,
      pitch,
      0
    ]
  }
}
