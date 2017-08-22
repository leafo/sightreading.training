import * as React from "react"
import {classNames, MersenneTwister} from "lib"

import NoteList from "st/note_list"

import Slider from "st/components/slider"
import Select from "st/components/select"

import {parseMidiMessage} from "st/midi"
import {setTitle} from "st/globals"
import {MajorScale} from "st/music"
import {RandomNotes} from "st/generators"
import {STAVES} from "st/data"

let ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

export default class EarTrainingPage extends React.Component {
  componentDidMount() {
    setTitle("Ear Training")
  }

  constructor(props) {
    super(props)
    this.setNotesPerMelody = value => this.setState({ notesPerMelody: value })

    this.state = {
      noteHistory: new NoteList([]),
      touchedNotes: {},
      notesPerMelody: 3,
      notesPerColumn: 1,
      continuousMelody: false,

      melodyRange: ["C4", "C6"],
      meldoyScaleRoot: "random",

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
    this.props.midiOutput.playNoteList(notes).then(() => {
      this.setState({ playing: false })
    })
  }

  pushMelody() {
    let scaleRoot = null

    if (this.state.meldoyScaleRoot == "random") {
      scaleRoot = ROOTS[this.state.rand.int() % ROOTS.length]
    } else {
      scaleRoot = this.state.meldoyScaleRoot
    }

    let notes = new MajorScale(scaleRoot).getLooseRange(...this.state.melodyRange)

    let generator
    if (this.state.continuousMelody && this.currentNotes) {
      // reuse the same generator so the melody is smooth
      generator = this.state.currentNotes.generator
      generator.notes = notes // replace notes with the new set generated
      generator.notesPerColumn = this.state.notesPerColumn
    } else {
      generator = new RandomNotes(notes, {
        smoothness: 6,
        notes: this.state.notesPerColumn,
        hands: 1,
      })
    }

    // create a test melody
    let list = new NoteList([], { generator })
    list.fillBuffer(this.state.notesPerMelody)

    this.props.midiOutput.playNoteList(list).then(() => {
      this.setState({ playing: false })
    })

    this.setState({
      playing: true,
      currentNotes: list
    })
  }

  render() {
    let contents
    if (this.props.midiOutput) {
      contents = this.renderMeldoyGenerator()
    } else {
      contents = this.renderIntro()
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
      ...STAVES.filter(s => s.mode == "notes")
    ]

    let warning

    if (!this.props.midiInput) {
      warning = <div className="warning">Select a MIDI input in the toolbar to enter notes.</div>
    }

    let page = <div className="page_container">
      {warning}
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
          onChange={this.setNotesPerMelody}
          value={this.state.notesPerMelody} />
        <span>{this.state.notesPerMelody}</span>

        <span className="spacer"></span>

        <label>
          <input
            type="checkbox"
            checked={this.state.continuousMelody}
            onChange={e => {
              this.setState({continuousMelody: e.target.checked})
            }} />

          <span className="label">Continuous melody</span>
        </label>

      </fieldset>

      <fieldset>
        <legend>Notes per column</legend>
        <Slider
          min={1}
          max={4}
          onChange={(value) => {
            this.setState({ notesPerColumn: value })
          }}
          value={this.state.notesPerColumn} />
        <span>{this.state.notesPerColumn}</span>
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

      <fieldset>
        <legend>Scale</legend>
        {this.renderScalPicker()}
      </fieldset>
    </div>

    return <div className="melody_generator">
      <div className="stats_row">
        <div className="stat_container">
          <div className="value">{this.state.successes}</div>
          <div className="label">Plays</div>
        </div>
      </div>
      {page}
    </div>
  }

  renderScalPicker() {
    if (!this.props.midi) {
      return;
    }

    return <label>
      <Select
        value={this.state.meldoyScaleRoot}
        onChange={(val) => this.setState({ meldoyScaleRoot: val})}
        options={[
          { name: "Random", value: "random"},
          ...ROOTS.map((r) => ({ name: `${r} major`, value: r }))
        ]}/>
    </label>
  }

  renderIntro() {
    if (!this.props.midi) {
      return <div className="choose_device">
        <strong>No MIDI support detected in your browser, ensure you're using Chrome</strong>
      </div>
    }

    return <div className="page_container choose_device">
      <h3>Choose a MIDI output device for ear training</h3>
      <p>This tool requires a MIDI device to play notes to. It will play you a
      melody, then you'll need to replay it. Once you play the correct melody the
      next melody will automatically play. You can trigger the melody to reply by
      interacting with any of the sliders or pedals on your MIDI controller.</p>

      <p>Select a MIDI output device by clicking the device selector in the top toolbar.</p>
    </div>
  }
}
