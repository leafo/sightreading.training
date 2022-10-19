import * as React from "react"
import * as ReactDOM from "react-dom"
import classNames from "classnames"
import {Link, NavLink} from "react-router-dom"

import {trigger} from "st/events"
import MidiButton from "st/components/midi_button"
import {IconDownArrow} from "st/components/icons"

import Lightbox from "st/components/lightbox"

import {getSession} from "st/app"

class SizedElement extends React.Component {
  constructor(props) {
    super(props)
    this.state = { }
  }

  componentDidMount() {
    this.refreshWidth()

    let timeout = null
    this.resizeCallback = e => {
      if (timeout) {
        window.clearTimeout(timeout)
        timeout = null
      }

      timeout = window.setTimeout(() => {
        this.refreshWidth()
        timeout = null
      }, 100)
    }

    window.addEventListener("resize", this.resizeCallback)
    this.resizeCallback()
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.resizeCallback)
  }

  refreshWidth() {
    let el = ReactDOM.findDOMNode(this)
    let width = el.getBoundingClientRect().width
    if (this.state.width != width) {
      this.setState({
        width: width
      }, function() {
        if (this.props.onWidth) {
          this.props.onWidth(this.state.width)
        }
      })
    }
  }

  render() {
    return <div className={classNames("sized_element", this.props.className)}>
      {this.state.width ? this.props.children : null}
    </div>
  }
}

export default class Header extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      menuOpen: false
    }
  }

  renderNavigationMenu() {
    let userLinks = this.getPageLinks()

    let menu = null
    let showMidiButton = !this.state.width || this.state.width < 450

    if (this.state.menuOpen) {
      let accountArea = null
      const session = getSession()

      if (session.currentUser) {
        accountArea = <div className="account_area logged_in">
          <span className="username">
            {session.currentUser.username}
          </span>
          <a href="#" onClick={this.props.doLogout}>Log out</a>
        </div>
      } else {
        accountArea = <div className="account_area logged_out">
          <NavLink to="/login" activeClassName="active">Log in</NavLink>
          <NavLink to="/register" activeClassName="active">Register</NavLink>
        </div>
      }

      menu = <Lightbox
        key="navigation_menu"
        className="navigation_menu"
        onClick={e => {
          if (e.target.matches("a")) {
            this.setState({ menuOpen: false })
          }
        }}
        onClose={(lb) => {
          this.setState({ menuOpen: false })
        }}
      >
        {accountArea}
        {showMidiButton ? <div className="midi_button_wrapper">{this.renderMidiButton()}</div> : null}
        <ul>
          {userLinks.map((link, i) => <li key={i}>{link}</li>)}
        </ul>
      </Lightbox>
    }

    return <div className="menu_toggle">
      <button type="button" onClick={e => {
        this.setState({ menuOpen: !this.state.menuOpen })
      }}>Menu {<IconDownArrow width={12}/>}</button>
      {menu ? <div
        onClick={e => this.setState({ menuOpen: false })}
        className="menu_shroud"></div> : null}
      {menu}
    </div>
  }

  renderHorizontalNavigation() {
    let userPanel = null
    let userLinks = this.getPageLinks()

    const session = getSession()

    if (session.currentUser) {
      userPanel = <div className="right_section" key="user_in">
        {session.currentUser.username}
        {" " }
        <a href="#" onClick={this.props.doLogout}>Log out</a>
      </div>

    } else {
      userPanel = <div className="right_section" key="user_out">
        <NavLink to="/login" activeClassName="active">Log in</NavLink>
        {" or "}
        <NavLink to="/register" activeClassName="active">Register</NavLink>
      </div>
    }

    return [
      ...userLinks,
      userPanel,
    ]
  }

  getPageLinks() {
    let links = [
      <NavLink exact key="root" to="/" activeClassName="active">Staff</NavLink>,
      <NavLink exact key="ear-training" to="/ear-training/interval-melodies" activeClassName="active">Ear Training</NavLink>,
      <NavLink exact key="flash-cards" to="/flash-cards/note-math" activeClassName="active">Flash Cards</NavLink>,
      <NavLink key="play-along" to="/play-along" activeClassName="active">Play Along</NavLink>,
      <NavLink exact key="about" to="/about" activeClassName="active">Guide</NavLink>,
    ]

    const session = getSession()

    if (session.currentUser) {
      links.push(<NavLink
        exact
        key="stats"
        to="/stats"
        activeClassName="active">Stats</NavLink>)
    }

    return links
  }

  renderMidiButton() {
    return <MidiButton
      midiInput={this.props.midiInput}
      pickMidi={() => {
        trigger(this, "pickMidi")
      }} />
  }

  render() {
    let userPanel = null
    let enableDropdown = this.state.width && this.state.width < 700
    let hideMidiButton = !this.state.width || this.state.width < 450

    return <div className="header">
      <Link to="/" className="logo_link">
        <img className="logo" src="/static/img/logo.svg" height="35" alt="" />
        <img className="logo_small" src="/static/img/logo-small.svg" height="35" alt="" />
      </Link>

      <SizedElement className="user_links" onWidth={(w) => {
        this.setState({ width: w })
      }}>
        {enableDropdown ? this.renderNavigationMenu() : this.renderHorizontalNavigation()}
      </SizedElement>

      {hideMidiButton ? null : this.renderMidiButton()}
    </div>

  }
}
