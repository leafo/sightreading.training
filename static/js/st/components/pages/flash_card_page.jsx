
import * as React from "react"
import * as types from "prop-types"
import classNames from "classnames"
import MersenneTwister from "mersennetwister"

import {TransitionGroup, CSSTransition} from "react-transition-group"

import {setTitle} from "st/globals"

import Select from "st/components/select"

import NoteMathExercise from "st/components/flash_cards/note_math_exercise"
import ChordIdentificationExercise from "st/components/flash_cards/chord_identification_exercise"

import {Link, NavLink} from "react-router-dom"

import {toggleActive} from "st/components/util"

class SettingsPanel extends React.PureComponent {
  static propTypes = {
    close: types.func,
    updateSettings: types.func.isRequired,
    currentExercise: types.func.isRequired, // class
    currentExerciseSettings: types.object.isRequired,
  }

  render() {
    return <section className="settings_panel">
      <div className="settings_header">
        <h3>Settings</h3>
        <button onClick={this.props.close}>Close</button>
      </div>

      <section className="settings_group">
        <ul>
          <li><NavLink to="/flash-cards/chord-identification" {...toggleActive}>Chord Identification</NavLink></li>
          <li><NavLink to="/flash-cards/note-math" {...toggleActive}>Note Math</NavLink></li>
        </ul>
      </section>
      {this.renderExerciseOptions()}
    </section>
  }

  renderExerciseOptions() {
    if (!this.props.currentExercise) {
      return
    }

    let ExerciseOptions = this.props.currentExercise.ExerciseOptions
    return <ExerciseOptions
      updateSettings={this.props.updateSettings}
      currentSettings={this.props.currentExerciseSettings} />
  }
}


export default class FlashCardPage extends React.PureComponent {
  static defaultProps = {
    exercise: "chord_identification"
  }

  constructor(props) {
    super(props)

    this.exercises = [
      NoteMathExercise,
      ChordIdentificationExercise,
    ]

    this.state = {
      currentExerciseSettings: {},
      settingsPanelOpen: false,
    }

    this.state.currentExerciseSettings = this.getExercise().defaultSettings()
    this.updateExerciseSettings = this.updateExerciseSettings.bind(this)
    this.closeSettingsPanel = () => this.setState({ settingsPanelOpen: false })
  }

  getExercise() {
    let exercise = this.exercises.find(e => e.exerciseId == this.props.exercise)
    if (!exercise) {
      exercise = this.exercises[0]
    }

    return exercise
  }

  updateExerciseSettings(settings) {
    this.setState({
      currentExerciseSettings: settings
    })
  }

  componentDidMount() {
    setTitle("Flash Cards")
  }

  render() {
    let Exercise = this.getExercise()

    return <div className="flash_card_page">
      <div className="flash_card_header">
        <div className="exercise_label">{Exercise ? Exercise.exerciseName : ""}</div>
        <button onClick={e => this.setState({
          settingsPanelOpen: !this.state.settingsPanelOpen
        })} type="button">Settings</button>
      </div>

      {this.renderExercise()}

      <TransitionGroup>
        {this.renderSettings()}
      </TransitionGroup>
    </div>
  }

  renderExercise() {
    let Exercise = this.getExercise()
    return <Exercise settings={this.state.currentExerciseSettings} />
  }

  renderSettings() {
    if (!this.state.settingsPanelOpen) {
      return
    }

    let Exercise = this.getExercise()

    return <CSSTransition classNames="slide_right" timeout={{enter: 200, exit: 100}}>
      <SettingsPanel
        close={this.closeSettingsPanel}
        setExercise={function() { alert("fix me") }}
        currentExercise={Exercise}
        currentExerciseSettings={this.state.currentExerciseSettings}
        updateSettings={this.updateExerciseSettings}
      />
    </CSSTransition>
  }
}
