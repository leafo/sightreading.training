import * as React from "react"
import {classNames, MersenneTwister} from "lib"
import * as types from "prop-types"

import {SongNoteList} from "st/song_note_list"
import Slider from "st/components/slider"

import {noteName, parseNote} from "st/music"
import SongParser from "st/song_parser"

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
