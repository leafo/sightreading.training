import * as React from "react"
import {classNames, MersenneTwister} from "lib"

import NoteList from "st/note_list"

import Slider from "st/components/slider"
import Select from "st/components/select"

import {parseMidiMessage} from "st/midi"
import {setTitle} from "st/globals"
import {MajorScale, parseNote, noteName} from "st/music"
import {RandomNotes} from "st/generators"
import {STAVES} from "st/data"

import * as types from "prop-types"
import {TransitionGroup, CSSTransition} from "react-transition-group"

import Keyboard from "st/components/keyboard"
import MidiButton from "st/components/midi_button"

import SongParser from "st/song_parser"

import {dispatch, trigger} from "st/events"
import {SongNoteList} from "st/song_note_list"

class MelodyRecognitionExercise extends React.Component {
  static exerciseName = "Interval Melodies"
  static exerciseId = "melody_recognition"
  static melodies = [
    {
      interval: "m2",
      direction: "asc",
      song: "m2_jaws",
      title: "Jaws"
    }, {
      interval: "M2",
      direction: "asc",
      song: "M2_silent_night",
      title: "Silent Night"
    }, {
      interval: "m3",
      direction: "asc",
      song: "m3_greensleves",
      title: "Greensleves",
    }, {
      interval: "M3",
      direction: "asc",
      song: "M3_oh_when_the_saints",
      title: "On When The Saints",
    }, {
      interval: "P4",
      direction: "asc",
      song: "P4_here_comes_the_bride",
      title: "Here Comes The Bride",
    }, {
      interval: "T",
      direction: "asc",
      song: "T_simpsons",
      title: "The Simpsons",
    }, {
      interval: "P5",
      direction: "asc",
      song: "P5_star_wars",
      title: "Star Wars",
    }, {
      interval: "m6",
      direction: "asc",
      song: "m6_entertainer",
      title: "Entertainer",
    }, {
      interval: "M6",
      direction: "asc",
      song: "M6_nbc",
      title: "NBC",
    }, {
      interval: "m7",
      direction: "asc",
      song: "m7_star_trek",
      title: "Star Trek",
    }, {
      interval: "M7",
      direction: "asc",
      song: "M7_take_on_me",
      title: "Take On Me",
    }, {
      interval: "P8",
      direction: "asc",
      song: "P8_somewhere_over_the_rainbow",
      title: "Somewhere Over The Rainbow",
    }
  ]

  static melodyCache = {}
  static fetchMelody(name) {
    if (!this.melodyCache[name]) {
      this.melodyCache[name] = new Promise((resolve, reject) => {
        let request = new XMLHttpRequest()
        request.open("GET", `/static/music/interval_melodies/${name}.lml?${+new Date()}`)
        request.onerror = () => reject(request.statusText)
        request.onload = (e) => {
          let songText = request.responseText
          let song

          try {
            song = SongParser.load(songText)
          } catch (e) {
            console.log(e)
            return reject(`Failed to parse: ${name}`)
          }

          // transpose to middle c
          let root = parseNote(song[0].note)
          song = song.transpose(60 - root)

          resolve(song)
        }

        request.send()
      })

    }

    return this.melodyCache[name]
  }

  constructor(props) {
    super(props)
    this.state = {
      loading: true,
      playbackBpm: 90,
      playbackTranspose: 0,
      enabledIntervals: {},
      rand: new MersenneTwister(),
    }
  }

  componentDidMount() {
    let loadingCount = 0

    this.setState({
      loading: true
    })

    let melodySongs = {}
    let enabled = {}

    MelodyRecognitionExercise.melodies.forEach((m) => {
      loadingCount += 1
      MelodyRecognitionExercise.fetchMelody(m.song).then(song => {
        loadingCount -= 1
        melodySongs[m.interval] = song
        enabled[`${m.interval}-${m.direction}`] = true

        if (loadingCount == 0) {
          this.setState({
            loading: false,
            melodySongs,
            enabledIntervals: enabled
          })
        }
      }).catch(e => console.warn(e))
    })
  }

  componentWillUnmount() {
    if (this.state.playingTimer) {
      this.state.playingTimer.stop()
    }
  }

  nextMelody() {
    let intervals = MelodyRecognitionExercise.melodies.filter(m =>
      this.state.enabledIntervals[`${m.interval}-${m.direction}`]
    )

    let interval = intervals[this.state.rand.int() % intervals.length]

    this.setState({
      currentMelody: interval
    })
  }

  playSong(song) {
    song = song.transpose(this.state.playbackTranspose)

    let timer = song.play(this.props.midiOutput, {
      bpm: this.state.playbackBpm
    })

    this.setState({
      playing: true,
      playingTimer: timer
    })

    timer.getPromise().then(() => {
      this.setState({
        playing: false,
        playingTimer: null,
      })
    })
  }

  render() {
    return <div className="melody_recognition_exercise">
      {this.state.loading ?
        <div className="page_container">Loading</div>
      :
        <div className="page_container">
          {this.renderSongPlayer()}
          {this.renderIntervalSettings()}
        </div>
      }
    </div>
  }

  renderSongPlayer() {
    let current = this.state.currentMelody

    let currentSongTools
    if (current) {
      let currentSong = this.state.melodySongs[current.interval]

      let stopSong
      if (this.state.playingTimer) {
        stopSong = <button
          type="button"
          onClick={e => this.state.playingTimer.stop() }>Stop</button>
      }

      let firstNote = noteName(parseNote(currentSong[0].note) + this.state.playbackTranspose)

      currentSongTools = <div className="current_song">
        <div className="song_title">{current.interval} - {current.title} ({firstNote})</div>
        <div className="song_controls">
          <button
            disabled={!!this.state.playing}
            type="button"
            onClick={e => {
              let song = this.state.melodySongs[current.interval]
              let first = new SongNoteList()
              let note = song[0].clone()
              note.duration = 1
              first.push(note)
              this.playSong(first)
            }}>Play root</button>

          <button
            type="button"
            disabled={!!this.state.playing}
            onClick={e => {
              this.playSong(this.state.melodySongs[current.interval])
          }}>Play song</button>
          {stopSong}
        </div>
      </div>
    }

    return <div className="song_selector">
      <div className="global_controls">
        <button
          disabled={this.state.playing || false}
          onClick={(e) => { this.nextMelody() }}>Next melody</button>

        <label className="slider_group">
          <span>BPM</span>
          <Slider
            min={40}
            max={160}
            onChange={(value) => {
              this.setState({ playbackBpm: value })
            }}
            value={this.state.playbackBpm} />
          <code>{this.state.playbackBpm}</code>
        </label>

        <label className="slider_group">
          <span>Transpose</span>
          <Slider
            min={-24}
            max={24}
            onChange={(value) => {
              this.setState({ playbackTranspose: value })
            }}
            value={this.state.playbackTranspose} />
          <code>{this.state.playbackTranspose}</code>
          <button
          type="button"
            onClick={e=>
              this.setState({
                playbackTranspose: (this.state.rand.int() % 36) - 18
              })
            }
            className="shuffle_button">🔀</button>
        </label>
      </div>
      {currentSongTools}
    </div>
  }

  renderIntervalSettings() {
    let inputs = MelodyRecognitionExercise.melodies.map((m) => {
      let key = `${m.interval}-${m.direction}`

      return <li key={key}>
        <label>
          <input
            type="checkbox"
            onChange={e => {
              this.setState({
                enabledIntervals: {
                  ...this.state.enabledIntervals,
                  [key]: e.target.checked,
                }
              })
            }}
            checked={this.state.enabledIntervals[key] || false} />
          {" "}
          <span className="label">{m.interval} {m.name}</span>
        </label>
      </li>
    })

    return <section className="interval_settings">
      <fieldset className="enabled_intervals">
        <legend>Intervals</legend>
        <ul>
          {inputs}
          <li>
            <button
              type="button"
              onClick={e => this.setState({ enabledIntervals: {} })}
              >All off</button>
          </li>
        </ul>
      </fieldset>
    </section>
  }
}

class MelodyPlaybackExercise extends React.Component {
  static exerciseName = "Melody Playback"
  static exerciseId = "melody_playback"

  static ROOTS = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"
  ]

  constructor(props) {
    super(props)
    this.setNotesPerMelody = value => this.setState({ notesPerMelody: value })

    this.state = {
      noteHistory: new NoteList([]),
      touchedNotes: {},
      keyboardHeldNotes: {},
      notesPerMelody: 3,
      notesPerColumn: 1,
      continuousMelody: false,

      melodyRange: ["C4", "C6"],
      meldoyScaleRoot: "random",

      rand: new MersenneTwister(),
      successes: 0,
    }

    this.keyboardPressNote = this.keyboardPressNote.bind(this)
    this.keyboardReleaseNote = this.keyboardReleaseNote.bind(this)
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
      this.pressNote(note)
    }

    if (e == "noteOff") {
      this.releaseNote(note)
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
      scaleRoot = MelodyPlaybackExercise.ROOTS[this.state.rand.int() % MelodyPlaybackExercise.ROOTS.length]
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

    let instructions
    if (this.state.showInstructions) {
      instructions = <p>Click <em>New melody</em> to generate a random melody, then play it
        back using the onscreen keyboard or your MIDI input device. You'll be given
        a new melody after figuring out what you heard. You can trigger current the
        melody to replay by interacting with any of the sliders or pedals on your
        MIDI controller.</p>
    } else {
      instructions = <p>
        <a href="javascript:void(0)" onClick={e => {
          e.preventDefault()
          this.setState({ showInstructions: true })
        }}>Show instructions...</a>
      </p>
    }


    let page = <div className="page_container">
      {instructions}
      <div className="stat_controls">
        {repeatButton}
        <button disabled={locked} onClick={(e) => {
          e.preventDefault()
          this.pushMelody()
        }}>New melody</button>
        <span>{this.state.statusMessage}</span>

        <div className="stats_row">
          <div className="stat_container">
            <div className="value">{this.state.successes}</div>
            <div className="label">Melodies</div>
          </div>
        </div>
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
        {this.renderScalePicker()}
      </fieldset>
    </div>

    return <div className="melody_playback_exercise keyboard_open">
      <div className="workspace">
        {page}
      </div>
      {this.renderKeyboard()}
    </div>
  }

  renderScalePicker() {
    if (!this.props.midi) {
      return;
    }

    return <label>
      <Select
        value={this.state.meldoyScaleRoot}
        onChange={(val) => this.setState({ meldoyScaleRoot: val})}
        options={[
          { name: "Random", value: "random"},
          ...MelodyPlaybackExercise.ROOTS.map((r) => ({ name: `${r} major`, value: r }))
        ]}/>
    </label>
  }

  keyboardPressNote(note) {
    if (this.props.midiOutput) {
      this.props.midiOutput.noteOn(parseNote(note), 100)
    }

    this.pressNote(note)
  }

  keyboardReleaseNote(note) {
    if (this.props.midiOutput) {
      this.props.midiOutput.noteOff(parseNote(note))
    }

    this.releaseNote(note)
  }

  pressNote(note) {
    this.setState({
      keyboardHeldNotes: {
        ...this.state.keyboardHeldNotes,
        [note]: true
      }
    })

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

  releaseNote(note) {
      if (!this.pressedNotes) { return }
      if (!this.pressedNotes[note]) { return }
      this.pressedNotes[note] -= 1

      if (this.pressedNotes[note] < 1) {
        delete this.pressedNotes[note]
      }

      if (Object.keys(this.pressedNotes).length == 0) {
        this.checkForMatch()
      }

    this.setState({
      keyboardHeldNotes: {
        ...this.state.keyboardHeldNotes,
        [note]: false
      }
    })
  }

  renderKeyboard() {
    return <Keyboard
      lower={this.state.melodyRange[0]}
      upper={this.state.melodyRange[1]}
      heldNotes={this.state.keyboardHeldNotes}
      onKeyDown={this.keyboardPressNote}
      onKeyUp={this.keyboardReleaseNote} />
  }
}

class SettingsPanel extends React.PureComponent {
  static propTypes = {
    close: types.func,
    // not settings yet
    // updateSettings: types.func.isRequired,
    // currentExerciseSettings: types.object.isRequired,
    exercises: types.array.isRequired,
    setExercise: types.func.isRequired,
    currentExercise: types.func.isRequired, // class
  }

  render() {
    const current = this.props.currentExercise

    return <section className="settings_panel">
      <div className="settings_header">
        <button onClick={this.props.close}>Close</button>
        <h3>Settings</h3>
      </div>

      <section className="settings_group">
        <Select
          name="exercise"
          className="exercise_selector"
          value={current ? current.exerciseId : null}
          onChange={this.props.setExercise}
          options={this.props.exercises.map(e => ({
            name: e.exerciseName,
            value: e.exerciseId
          }))}/>
      </section>
    </section>
  }
}

export default class EarTrainingPage extends React.Component {
  componentDidMount() {
    setTitle("Ear Training")
  }

  constructor(props) {
    super(props)

    this.exercises = [
      MelodyRecognitionExercise,
      MelodyPlaybackExercise,
    ]

    this.state = {
      settingsPanelOpen: false,
      currentExerciseIdx: 0,
    }

    this.setExercise = this.setExercise.bind(this)
    this.closeSettingsPanel = () => this.setState({ settingsPanelOpen: false })
  }

  setExercise(exerciseName) {
    let exercise = this.exercises.find(e => e.exerciseId == exerciseName)

    if (!exercise) {
      // try by id
      exercise = this.exercises[exerciseName]
    }

    if (!exercise) {
      throw new Error(`Invalid exercise ${exerciseName}`)
    }

    let idx = this.exercises.indexOf(exercise)

    this.setState({
      currentExerciseIdx: idx,
    })
  }

  onMidiMessage(message) {
    if (this.currentExercise) {
      this.currentExercise.onMidiMessage(message)
    }
  }

  render() {
    let contents
    if (this.props.midiOutput) {
      contents = this.renderExercise()
    } else {
      contents = this.renderIntro()
    }

    let Exercise = this.exercises[this.state.currentExerciseIdx]

    let header =
      <div className="exercise_header">
        <div className="exercise_label">{Exercise ? Exercise.exerciseName : ""}</div>
        <button
          onClick={e => this.setState({
            settingsPanelOpen: !this.state.settingsPanelOpen
          })}
          type="button">Choose Exercise</button>
      </div>

    return <div className="ear_training_page">
      {this.props.midiOutput ? header : null}
      {contents}
      <TransitionGroup>
        {this.renderSettings()}
      </TransitionGroup>
    </div>
  }

  renderSettings() {
    if (!this.state.settingsPanelOpen) {
      return
    }

    let Exercise = this.exercises[this.state.currentExerciseIdx]

    return <CSSTransition classNames="slide_right" timeout={{enter: 200, exit: 100}}>
      <SettingsPanel
        close={this.closeSettingsPanel}
        setExercise={this.setExercise}
        exercises={this.exercises}
        currentExercise={Exercise}
      />
    </CSSTransition>
  }

  renderExercise() {
    let Exercise = this.exercises[this.state.currentExerciseIdx]

    return <Exercise
      ref={(e) => this.currentExercise = e}
      midi={this.props.midi}
      midiOutput={this.props.midiOutput}
      midiInput={this.props.midiInput}
      />
  }

  renderIntro() {
    if (!this.props.midi) {
      return <div className="page_container choose_device">
        <strong>No MIDI support detected in your browser, ensure you're using Chrome</strong>
      </div>
    }

    return <div className="page_container choose_device">
      <h3>Choose a MIDI output device for ear training</h3>
      <p>The ear training tools require a MIDI output device in order to play notes. Select your MIDI devices:</p>


      <MidiButton
        midiInput={this.props.midiOutput}
        pickMidi={() => {
          trigger(this, "pickMidi")
        }} />
    </div>
  }
}
