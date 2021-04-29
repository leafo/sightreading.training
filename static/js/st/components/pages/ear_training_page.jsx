import * as React from "react"
import {Link, NavLink, Switch, Route, Redirect} from "react-router-dom"
import classNames from "classnames"

import Select from "st/components/select"

import {setTitle} from "st/globals"

import * as types from "prop-types"
import {TransitionGroup, CSSTransition} from "react-transition-group"
import MidiButton from "st/components/midi_button"

import {dispatch, trigger} from "st/events"

import MelodyRecognitionExercise from "st/components/ear_training/melody_recognition_exercise"
import MelodyPlaybackExercise from "st/components/ear_training/melody_playback_exercise"

import {IconMenu} from "st/components/icons"

export default class EarTrainingPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
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

    return <div className={classNames("ear_training_page has_sidebar", { sidebar_open: this.state.sidebarOpen })}>
      <div className="sidebar">
        <nav>
          <div className="nav_header">Choose Exercise</div>
          <ul>
            <li><NavLink to="/ear-training/interval-melodies" activeClassName="active">Learn Intervals</NavLink></li>
            <li><NavLink to="/ear-training/melody-playback" activeClassName="active">Play Back Melodies</NavLink></li>
          </ul>
        </nav>

        <button
          type="button"
          onClick={()=> this.toggleSidebar()}
          className="button toggle_sidebar_button">Close</button>
      </div>

      <div className="content_column">
        {contents}
      </div>
    </div>
  }

  toggleSidebar() {
    this.setState(s => ({ sidebarOpen: !s.sidebarOpen }))
  }

  renderExercise() {
    let toggleSidebarButton = <button
      type="button"
      className="toggle_sidebar_button button outline"
      onClick={() => this.toggleSidebar()}
    >
      <IconMenu width={20} height={20} />
      Exercises
    </button>


    const exerciseProps = {
      ref: (e) => this.currentExercise = e,
      midi: this.props.midi,
      midiOutput: this.props.midiOutput,
      midiInput: this.props.midiInput,
      toggleSidebarButton 
    }

    return <Switch>
      <Route exact path="/ear-training/interval-melodies">
        <MelodyRecognitionExercise {...exerciseProps} />
      </Route>
      <Route exact path="/ear-training/melody-playback">
        <MelodyPlaybackExercise {...exerciseProps} />
      </Route>
      <Route>
        <Redirect to="/ear-training/interval-melodies" />
      </Route>
    </Switch>
  }

  renderIntro() {
    return <div className="page_container choose_device">
      <h3>Choose a MIDI output device for ear training</h3>
      <p>The ear training tools require an output device to be configured.</p>

      <MidiButton
        midiInput={this.props.midiOutput}
        pickMidi={() => {
          trigger(this, "pickMidi")
        }} />
    </div>
  }
}
