/*global N*/
import * as React from "react"

import {Link, NavLink} from "react-router-dom"

export default class SongsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.refreshSongs()
  }

  componentWillUnmount() {
    if (this.request) {
      this.request.abort()
      delete this.request
    }
  }

  refreshSongs() {
    if (this.state.loading) {
      return
    }

    this.setState({
      loading: true
    })

    let request = new XMLHttpRequest()
    request.open("GET", `/songs.json`)
    request.send()
    request.onload = (e) => {
      delete this.request
      try {
        let res = JSON.parse(request.responseText)
        console.log(res)
        this.setState({
          loading: false,
          songs: res.songs || [],
          mySongs: res.my_songs || [],
        })
      } catch (e) {
        this.setState({loading: false, error_message: "Failed to fetch stats"})
      }
    }

    this.request = request
  }

  render() {
    if (!this.state.songs) {
      return <div className="page_container">Loading...</div>
    }

    let mySongs
    if (N.session.currentUser) {
      mySongs = <section>
        <h2>My songs</h2>
        <p>
          <Link to="/new-song" className="button">Create a new song</Link>
        </p>
        <ul>{this.state.mySongs.map(song =>
          <li key={song.id}>
          <Link to={song.url}>{song.title}</Link> updated at {song.updated_at}</li>
        )}</ul>
      </section>
    }

    return <div className="songs_page page_container">
      <section>
        <h2>Songs</h2>
        <ul>{this.state.songs.map(song =>
          <li key={song.id}>
          <Link to={song.url}>{song.title}</Link> from {song.user.name}</li>
        )}</ul>
      </section>

      {mySongs}
    </div>
  }
}
