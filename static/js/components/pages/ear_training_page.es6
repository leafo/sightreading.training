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
      melodyRange: ["C4", "C6"],
      rand: new MersenneTwister(),
      successes: 0,
      outChannel: 0,
      outInstrument: 0,
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

    if (e == "dataEntry") {
      if (!this.state.playing) {
        // use the pitch wheel to trigger new melody or replay
        if (this.state.currentNotes) {
          this.playMelody()
        } else {
          this.pushMelody()
        }
      }
    }

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
      smoothness: 6
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

    let ranges = [
      {
        name: "singing",
        range: ["C4", "C6"]
      },
      ...N.STAVES.filter(s => s.mode == "notes")
    ]

    return <div className="melody_generator">
      <div>
      {repeatButton}
      {" "}
      <button disabled={locked} onClick={(e) => {
        e.preventDefault()
        this.pushMelody()
      }}>New melody</button>
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
      return <div className="choose_device">
        <strong>No MIDI support detected in your browser, ensure you're using Chrome</strong>
      </div>
    }

    return <div className="choose_device">
      <h3>Choose a MIDI output device</h3>
      <p>This tool requires a MIDI device to play notes to.</p>

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
        selectedInput={(idx) => {
          let output = this.midiOutputs()[idx]
          let channel = new MidiChannel(output, this.state.outChannel)
          channel.setInstrument(this.state.outInstrument)
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
