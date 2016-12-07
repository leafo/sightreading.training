let {Link} = ReactRouter

class EarTrainingPage extends React.Component {
  componentDidMount() {
    N.setTitle("Ear Training")
  }

  constructor(props) {
    super(props)

    this.state = {
      midiChannel: null,
      noteHistory: new NoteList([]),
      touchedNotes: {},
    }
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }

  onMidiMessage(message) {
    let parsed = parseMidiMessage(message)
    if (!parsed) { return }

    let [e, note] = parsed

    if (e == "noteOn") {
      this.pressedNotes = this.pressedNotes || {}

      let newColumn = Object.keys(this.pressedNotes) == 0

      if (newColumn) {
        this.state.noteHistory.push([note])
      } else {
        this.state.noteHistory[this.state.noteHistory.length - 1].push(note)
      }

      this.pressedNotes[note] = this.pressedNotes[note] || 0
      this.pressedNotes[note] += 1
    }

    if (e == "noteOff") {
      if (!this.pressedNotes) { return }
      if (!this.pressedNotes[note]) { return }
      this.pressedNotes[note] -= 1

      if (this.pressedNotes[note] < 1) {
        delete this.pressedNotes[note]
      }

      if (Object.keys(this.pressedNotes).length == 0) {
        this.checkForMatch()
      }
    }
  }

  // see if the pressed notes buffer matches the melody
  checkForMatch() {
    if (!this.state.currentNotes || !this.state.noteHistory) {
      return
    }

    if (this.state.noteHistory.length < this.state.currentNotes.length) {
      return
    }

    while (this.state.noteHistory.length > this.state.currentNotes.length) {
      this.state.noteHistory.shift()
    }

    if (this.state.noteHistory.toString() == this.state.currentNotes.toString()) {
      this.setState({
        noteHistory: new NoteList([]),
        locked: true
      })
      setTimeout(() => {
        this.setState({ locked: false })
        this.pushMelody()
      }, 1000)
    }
  }

  playMelody(notes=this.state.currentNotes) {
    // need to add cancel
    if (this.state.playing) {
      console.warn("aborting playing, something is already playing")
      return
    }

    this.setState({ playing: true })
    this.state.midiChannel.playNoteList(notes).then(() => {
      this.setState({ playing: false })
    })
  }

  pushMelody() {
    let generator = new RandomNotes(new MajorScale("C").getRange(5), {
      smoothness: 3
    })

    // create a test melody
    let list = new NoteList([], { generator })
    list.fillBuffer(3)

    this.state.midiChannel.playNoteList(list).then(() => {
      this.setState({ playing: false })
    })

    this.setState({
      playing: true,
      currentNotes: list
    })
  }

  render() {
    let contents
    if (this.state.midiChannel) {
      contents = this.renderMeldoyGenerator()
    } else {
      contents = this.renderMidiPicker()
    }

    return <div className="ear_training_page">
      {contents}
    </div>
  }

  renderMeldoyGenerator() {
    let locked = this.state.playing || this.state.locked || false

    let repeatButton
    if (this.state.currentNotes) {
      repeatButton = <button disabled={locked} onClick={(e) => {
        e.preventDefault()
        this.playMelody()
      }}>Repeat melody</button>
    }

    return <div>
      <button disabled={locked} onClick={(e) => {
        e.preventDefault()
        this.pushMelody()
      }}>New melody</button>
      {" "}
      {repeatButton}
    </div>
  }

  renderMidiPicker() {
    if (!this.props.midi) {
      return
    }

    return <div className="choose_device">
      <h3>Choose a MIDI output device</h3>
      <p>This tool requires a MIDI device to play notes to.</p>
      <MidiSelector
        selectedInput={(idx) => {
          let output = this.midiOutputs()[idx]
          let channel = new MidiChannel(output, 0)
          channel.setInstrument(0)
          channel.testNote()
          // channel.setInstrument(56) // trumpet
          this.setState({
            midiChannel: channel
          })
        }}
        midiOptions={this.midiOutputs()} />
    </div>
  }
}
