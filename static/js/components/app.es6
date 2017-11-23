/*global N*/

import SightReadingPage from "st/components/pages/sight_reading_page"
import LoginPage from "st/components/pages/login_page"
import RegisterPage from "st/components/pages/register_page"
import GuidePage from "st/components/pages/guide_pages"
import StatsPage from "st/components/pages/stats"
import FlashCardPage from "st/components/pages/flash_card_page"
import EarTrainingPage from "st/components/pages/ear_training_page"
import PlayAlongPage from "st/components/pages/play_along_page"
import LatencyPage from "st/components/pages/latency"

import IntroLightbox from "st/components/intro_lightbox"

import {dispatch, trigger} from "st/events"
import {readConfig, writeConfig} from "st/config"
import {csrfToken} from "st/globals"

import * as React from "react"
import {BrowserRouter, Route, Link, NavLink} from "react-router-dom"

import {TransitionGroup, CSSTransition} from "react-transition-group"

let MidiButton = (props) =>
  <button
    onClick={(e) => {
      e.preventDefault()
      props.pickMidi()
    }}
    className="midi_button">
      <div>
        <img src="/static/svg/midi.svg" alt="MIDI" />
        <span className="current_input_name">
          {props.midiInput ? props.midiInput.name : "Select device"}
        </span>
      </div>
  </button>

class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        midi => {
          this.setState({midi: midi})
          this.loadDefaultSettings()
        },
        error => console.warn("failed to get MIDI"))
    }
  }

  componentDidCatch(error, info) {
    this.setState({
      hasError: true,
      error
    })
  }

  loadDefaultSettings() {
    let defaultMidiInput = readConfig("defaults:midiIn")
    if (defaultMidiInput) {
      let idx = 0
      for (let input of this.midiInputs()) {
        if (input.name == defaultMidiInput) {
          this.setInput(idx)
        }
        idx++
      }
    }
  }

  componentDidMount() {
    dispatch(this, {
      "lightboxClosed": e => this.setState({currentLightbox: null}),
      "closeLightbox": e => this.refs.currentLightbox.close(),
      "showLightbox": (e, lb) => {
        this.setState({
          currentLightbox: lb
        })
      },
      "pickMidi": (e) => {
        this.setState({
          currentLightbox: this.renderMidiLightbox()
        })
      }
    })
  }

  componentWillUnmount() {
    if (this.state.midiInput) {
      console.log(`Unbinding: ${this.state.midiInput.name}`)
      this.state.midiInput.onmidimessage = undefined
    }
  }

  // these are mixed into all children's props (lightboxes included)
  childProps() {
    return {
      midi: this.state.midi,
      midiInput: this.state.midiInput,
      midiOutput: this.state.midiOutputChannel,
    }
  }

  pageLayout(props) {
    return <div className="page_layout">
      <div className="header_spacer">
        {this.renderHeader()}
      </div>

      {props.children}

      <TransitionGroup>
        {this.renderCurrentLightbox()}
      </TransitionGroup>
    </div>
  }

  render() {
    let page = (C, moreProps) =>
      props => <C
        ref={comp => this.currentPage = comp}
        {...moreProps} {...this.childProps()} {...props} />

    let PageLayout = this.pageLayout.bind(this)

    if (this.state.hasError) {
      return <PageLayout>
        <div className="page_container page_error">
          <p>There was an error with the page, please try reloading</p>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
          <p>Report bugs <a href="https://github.com/leafo/sightreading.training/issues">on GitHub</a></p>
        </div>
      </PageLayout>
    }

    return <PageLayout>
      <Route exact path="/" render={page(SightReadingPage)}/>
      <Route exact path="/login" render={page(LoginPage)} />
      <Route exact path="/register" render={page(RegisterPage)} />
      <Route exact path="/ear-training" render={page(EarTrainingPage)} />
      <Route exact path="/flash-cards" render={page(FlashCardPage)} />
      <Route exact path="/play-along" render={page(PlayAlongPage)} />
      <Route exact path="/stats" render={page(StatsPage)} />
      <Route exact path="/latency" render={page(LatencyPage)} />

      <Route exact path="/about" render={page(GuidePage, {
        title: "About Sight Reading Trainer",
        pageSource: "about"
      })} />

      <Route path="/guide/generators" render={page(GuidePage, {
        title: "Sight Reading Random Notes",
        pageSource: "generators"
      })} />

      <Route path="/guide/chords" render={page(GuidePage, {
        title: "Sight Reading Random Chords",
        pageSource: "chord_generators"
      })} />
    </PageLayout>
  }

  renderCurrentLightbox() {
    if (!this.state.currentLightbox) { return }

    let lb = React.cloneElement(this.state.currentLightbox, {
      ref: "currentLightbox",
      ...this.childProps()
    })

    return <CSSTransition classNames="show_lightbox" timeout={{enter: 200, exit: 100}}>
      <div
      className="lightbox_shroud"
      onClick={(e) => {
        if (e.target.classList.contains("lightbox_shroud")) {
          this.refs.currentLightbox.close()
          e.preventDefault();
        }
      }}
      >{lb}</div>
    </CSSTransition>
  }

  doLogout() {
    let request = new XMLHttpRequest()
    request.open("POST", "/logout.json")
    let data = new FormData()
    data.append("csrf_token", csrfToken())
    request.send(data)

    request.onload = (e) => {
      let res = JSON.parse(request.responseText)
      N.init(res)
    }
  }

  renderHeader() {
    let userLinks = [
      <NavLink exact key="root" to="/" activeClassName="active">Staff</NavLink>,
      <NavLink exact key="ear-training" to="/ear-training" activeClassName="active">Ear Training</NavLink>,
      <NavLink exact key="flash-cards" to="/flash-cards" activeClassName="active">Flash Cards</NavLink>,
      <NavLink exact key="play-along" to="/play-along" activeClassName="active">Play Along</NavLink>,
      <NavLink exact key="about" to="/about" activeClassName="active">Guide</NavLink>,
    ]

    let userPanel = null

    if (N.session.currentUser) {
      userPanel = <div className="right_section">
        {N.session.currentUser.username}
        {" " }
        <a href="#" onClick={this.doLogout.bind(this)}>Log out</a>
      </div>

      userLinks.push(<NavLink
        exact
        key="stats"
        to="/stats"
        activeClassName="active">Stats</NavLink>)

    } else {
      userPanel = <div className="right_section">
        <NavLink to="/login" activeClassName="active">Log in</NavLink>
        {" or "}
        <NavLink to="/register" activeClassName="active">Register</NavLink>
      </div>
    }
    return <div className="header">
      <Link to="/" className="logo_link">
        <img className="logo" src="/static/img/logo.svg" height="35" alt="" />
        <img className="logo_small" src="/static/img/logo-small.svg" height="35" alt="" />
      </Link>

      {userLinks}
      {userPanel}
      <MidiButton {...this.childProps()} pickMidi={() => trigger(this, "pickMidi")} />
    </div>
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  setInput(idx) {
    let input = this.midiInputs()[idx]
    if (!input) { return }
    if (this.state.midiInput) {
      console.log(`Unbinding: ${this.state.midiInput.name}`)
      this.state.midiInput.onmidimessage = undefined
    }

    console.log(`Binding to: ${input.name}`)
    input.onmidimessage = this.onMidiMessage.bind(this)

    this.setState({
      midiInput: input,
      midiInputIdx: idx,
    })

    return input
  }

  onMidiMessage(message) {
    // forward to output if necessary
    if (this.state.forwardMidi && this.state.midiOutputChannel) {
      this.state.midiOutputChannel.output.send(message.data)
    }

    // proxy message to the current page
    if (this.currentPage && this.currentPage.onMidiMessage) {
      this.currentPage.onMidiMessage(message)
    }
  }

  renderMidiLightbox() {
    return <IntroLightbox
      forwardMidi={this.state.forwardMidi}
      selectedInputIdx={this.state.midiInputIdx}
      selectedOutputChannel={this.state.midiOutputChannel}
      selectedOutputIdx={this.state.midiOutputIdx}

      onClose={lb => {
        let config = lb.midiConfiguration()
        let input = this.setInput(config.inputIdx)

        this.setState({
          forwardMidi: config.forwardMidi,
          midiOutputChannel: config.outputChannel,
          midiOutputIdx: config.outputIdx
        })

        writeConfig("defaults:midiIn", input ? input.name : undefined)
      }} />
  }
}

export default class App extends React.Component {
  static Layout = Layout

  render() {
    return <BrowserRouter>
      <Layout />
    </BrowserRouter>
  }
}
