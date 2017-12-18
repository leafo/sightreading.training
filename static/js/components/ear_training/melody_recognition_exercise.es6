import * as React from "react"
import {classNames, MersenneTwister, NoSleep} from "lib"
import * as types from "prop-types"

import {SongNoteList} from "st/song_note_list"
import Slider from "st/components/slider"
import Select from "st/components/select"

import {noteName, parseNote} from "st/music"
import SongParser from "st/song_parser"
import {isMobile} from "st/browser"

export default class MelodyRecognitionExercise extends React.Component {
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
      autoplayRandomizeRoot: true,
      autoplayIntervalOrder: "default",
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

    if (this.state.autoplayTimer) {
      this.state.autoplayTimer.stop()
    }

    if (this.nosleep && this.nosleepEnabled) {
      this.nosleep.disable()
      this.nosleepEnabled = false
    }
  }

  nextMelody(fn) {
    let intervals = MelodyRecognitionExercise.melodies.filter(m =>
      this.state.enabledIntervals[`${m.interval}-${m.direction}`]
    )

    let interval = intervals[this.state.rand.int() % intervals.length]

    this.setState({
      currentMelody: interval
    }, fn)
  }

  playCurrentRoot() {
    let current = this.state.currentMelody

    if (!current) {
      return
    }

    let song = this.state.melodySongs[current.interval]
    let first = new SongNoteList()
    let note = song[0].clone()
    note.duration = 1
    first.push(note)
    return this.playSong(first)
  }

  playCurrentInterval() {
    let current = this.state.currentMelody

    if (!current) {
      return
    }

    let song = this.state.melodySongs[current.interval]
    let first = new SongNoteList()
    let note1 = song[0].clone()
    note1.start = 0
    note1.duration = 1

    let note2 = song[1].clone()
    note2.start = 1
    note2.duration = 1

    first.push(note1)
    first.push(note2)
    return this.playSong(first)
  }

  playCurrentSong() {
    let current = this.state.currentMelody

    if (!current) {
      return
    }

    return this.playSong(this.state.melodySongs[current.interval])
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

    return timer
  }

  autoplayDelay(time, fn) {
    let timer
    let t = window.setTimeout(() => {
      if (this.state.autoplayTimer == timer) {
        this.setState({
          autoplayTimer: undefined
        })
      }
      fn()
    }, time)

    timer = {
      stop: (reason) => {
        window.clearTimeout(t)
        if (reason == "skip") {
          fn()
        }
      }
    }

    this.setState({
      autoplayTimer: timer
    })
  }

  autoplayNextInterval() {
    if (isMobile() && !this.nosleepEnabled) {
      this.nosleep = this.nosleep || new NoSleep()
      this.nosleep.enable()
      this.nosleepEnabled = true
    }

    if (this.state.autoplayRandomizeRoot) {
      this.setState({
        playbackTranspose: (this.state.rand.int() % 36) - 18
      })
    }

    this.nextMelody(() => {
      let timer = this.playCurrentInterval()
      this.setState({
        autoplayTimer: timer,
        autoplayState: "playingInterval"
      })

      timer.getPromise().then((reason) => {
        if (reason == "stop") {
          return
        }

        this.autoplayDelay(2000, () => {
          let timer = this.playCurrentSong()
          this.setState({
            autoplayTimer: timer,
            autoplayState: "playingMelody"
          })

          timer.getPromise().then((reason) => {
            if (reason == "stop") {
              return
            }

            this.autoplayDelay(2000, () => {
              this.autoplayNextInterval()
            })
          })
        })
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
          {this.renderAutoplayer()}
        </div>
      }
    </div>
  }

  renderAutoplayer() {
    let skipButton
    if (this.state.autoplayTimer) {
      skipButton = <button
        onClick={(e) => {
          this.state.autoplayTimer.stop("skip")
        }}
      >Skip</button>
    }


    return <section className="auto_player">
      <h3>Autoplay mode</h3>
      <fieldset>
        <legend>Autoplay options</legend>
        <label>
          <input
            checked={this.state.autoplayRandomizeRoot}
            onChange={e => {
              this.setState({
                autoplayRandomizeRoot: e.target.checked
              })
            }}
            type="checkbox" /> Randomize root
        </label>
        {" "}
        <label>
          Order
          <Select 
            value={this.state.autoplayIntervalOrder}
            onChange={(v) => this.setState({ autoplayIntervalOrder: v })}
            options={[
              {name: "Regular", value: "default"},
              {name: "Reverse", value: "reverse"},
              {name: "Harmonic", value: "harmonic"},
            ]}
          />
        </label>
      </fieldset>

      <p>
        <button
          onClick={(e) => {
            e.preventDefault()
            if (this.state.autoplayTimer) {
              this.state.autoplayTimer.stop()

              if (this.nosleep && this.nosleepEnabled) {
                this.nosleep.disable()
                this.nosleepEnabled = false
              }

              this.setState({
                autoplayTimer: undefined
              })
            } else {
              this.autoplayNextInterval()
            }
          }}
          >{this.state.autoplayTimer ? "Stop" : "Start autoplay"}</button>
        {" "}
        {skipButton}
      </p>
    </section>
  }

  renderSongPlayer() {
    let current = this.state.currentMelody

    let currentSongTools
    if (current) {
      let currentSong = this.state.melodySongs[current.interval]

      let stopSong
      if (this.state.playingTimer && !this.state.autoplayTimer) {
        stopSong = <button
          type="button"
          onClick={e => this.state.playingTimer.stop() }>Stop</button>
      }

      let firstNote = noteName(parseNote(currentSong[0].note) + this.state.playbackTranspose)

      let disabled = !!(this.state.playing || this.state.autoplayTimer)

      let title = `${current.interval} - ${current.title} (${firstNote})`
      if (this.state.autoplayState == "playingInterval") {
        title = "Listen to interval..."
      }

      currentSongTools = <div className="current_song">
        <div className="song_title">{title}</div>
        <div className="song_controls">
          <button
            disabled={disabled}
            type="button"
            onClick={e => {
              this.playCurrentRoot()
            }}>Play root</button>

          <button
            type="button"
            disabled={disabled}
            onClick={e => {
              this.playCurrentSong()
          }}>Play song</button>
          {stopSong}
        </div>
      </div>
    }

    let disabled = !!(this.state.playing || this.state.autoplayTimer)

    return <div className="song_selector">
      <div className="global_controls">
        <button
          disabled={disabled}
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
