import * as React from "react"
import {classNames, MersenneTwister} from "lib"

import Select from "st/components/select"

import {setTitle} from "st/globals"

import * as types from "prop-types"
import {TransitionGroup, CSSTransition} from "react-transition-group"
import MidiButton from "st/components/midi_button"

import {dispatch, trigger} from "st/events"

import MelodyRecognitionExercise from "st/ear_training/melody_recognition_exercise"
import MelodyPlaybackExercise from "st/ear_training/melody_playback_exercise"

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
