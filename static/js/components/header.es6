
import * as React from "react"
import {Link, NavLink} from "react-router-dom"
import MidiButton from "st/components/midi_button"
import {trigger} from "st/events"

export default class Header extends React.Component {
  render() {
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
        <a href="#" onClick={this.props.doLogout}>Log out</a>
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

      <MidiButton
        midiInput={this.props.midiInput}
        pickMidi={() => {
          trigger(this, "pickMidi")
        }} />
    </div>

  }
}
