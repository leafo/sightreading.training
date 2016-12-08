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
      notesPerMelody: 3,
      melodyRange: ["A4", "C7"],
      rand: new MersenneTwister(),
      successes: 0,
    }
  }

  midiOutputs() {
    if (!this.props.midi) return []
    return [...this.props.midi.outputs.values()]
  }

  onMidiMessage(message) {
    let parsed = parseMidiMessage(message)

    if (message.data[0] == 176 && !this.state.playing) {
      // use the pitch wheel to trigger new melody or replay
      if (this.state.currentNotes) {
        this.playMelody()
      } else {
        this.pushMelody()
      }
    }

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
        locked: true,
        successes: this.state.successes + 1,
        statusMessage: "You got it"
      })

      setTimeout(() => {
        this.setState({
          locked: false,
          statusMessage: null
        })
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
    let keys = ["C", "D", "Bb", "E"]
    let key = keys[this.state.rand.int() % keys.length]

    let notes = new MajorScale(key).getLooseRange(...this.state.melodyRange)
    let generator = new RandomNotes(notes, {
      smoothness: 3
    })

    // create a test melody
    let list = new NoteList([], { generator })
    list.fillBuffer(this.state.notesPerMelody)

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

    let ranges = N.STAVES.filter(s => s.mode == "notes")

    return <div className="melody_generator">
      <div>
      <button disabled={locked} onClick={(e) => {
        e.preventDefault()
        this.pushMelody()
      }}>New melody</button>
      {" "}
      {repeatButton}
      {" "}
      <span>{this.state.statusMessage}</span>
      </div>

      <fieldset>
        <legend>Notes per melody</legend>
        <Slider
          min={2}
          max={8}
          onChange={(value) => {
            this.setState({ notesPerMelody: value })
          }}
          value={this.state.notesPerMelody} />
        <span>{this.state.notesPerMelody}</span>
      </fieldset>

      <fieldset className="range_picker">
        <legend>Range</legend>
        {ranges.map(r => {
          return <button
            className={classNames({
              active: r.range.join(",") == this.state.melodyRange.join(",")
            })}
            onClick={e => {
              e.preventDefault();
              this.setState({
                melodyRange: r.range
              })
            }}
            key={r.name}>{r.name}</button>
        })}
      </fieldset>
      <p>
        Successful reads:
        {" "}
        <strong>{this.state.successes}</strong>
      </p>
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
