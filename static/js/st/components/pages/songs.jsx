import * as React from "react"

import {Link, NavLink, Route, Switch} from "react-router-dom"

import {getSession} from "st/app"

class SongCell extends React.PureComponent {
  render() {
    let song = this.props.song
    let publishStatus
    let timePlayed

    if (song.publish_status == "draft") {
      publishStatus = <div className="publish_status">Draft</div>
    }

    if (song.current_user_time) {
      let minutes = song.current_user_time.time_spent / 60

      timePlayed = <div className="time_played">
        Played for {minutes.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} {minutes == 1 ? "minute" : "minutes"}
      </div>
    }

    return <div className="song_cell">
      {publishStatus}

      <div className="song_title">
        <Link to={song.url}>{song.title}</Link>
      </div>
      <div className="song_creator">
        {song.user.name}
      </div>
      {timePlayed}
      <div className="song_stats">
        <span>Notes: {song.notes_count}</span>
        <span>Duration: {song.beats_duration}</span>
      </div>
    </div>
  }
}


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
    let url = "/songs.json"
    if (this.props.filter) {
      url += `?filter=${this.props.filter}`
    }

    request.open("GET", url)
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

  renderSidebar() {
    return <section className="sidebar">
      <Link to="/new-song" className="button new_song_button">Create a new song</Link>

      <nav>
        <ul>
          <li>
            <NavLink exact activeClassName="active" to="/play-along">Overview</NavLink>
          </li>
          <li>
            <NavLink exact activeClassName="active" to="/play-along/recent">Recently played</NavLink>
          </li>
        </ul>
      </nav>
    </section>
  }

  renderMySongs() {
    const session = getSession()

    if (!session.currentUser) {
      return null
    }

    let songList
    if (this.state.mySongs && this.state.mySongs.length) {
      songList = <ul className="song_cell_list">{this.state.mySongs.map(song =>
        <li key={song.id}>
          <SongCell song={song} key={song.id}/>
        </li>
      )}</ul>
    } else {
      songList = <p className="empty_message">No results</p>
    }

    if (!songList) {
      songList = <React.Fragment>
        <p>Any songs you create or edit will show up here.</p>
        <p>
          <Link to="/new-song" className="button new_song_button">Create a new song</Link>
        </p>
      </React.Fragment>
    }

    return <section>
      <h2>My Songs</h2>
      {songList}
    </section>
  }


  renderOverview() {
    if (!this.state.songs) {
      return <div className="page_container">Loading...</div>
    }

    let songList

    if (this.state.songs.length) {
      songList = <ul className="song_cell_list">{this.state.songs.map(song =>
        <li key={song.id}>
          <SongCell song={song} key={song.id}/>
        </li>
      )}</ul>
    } else {
      songList = <p className="empty_message">No results</p>
    }

    return <section className="content_column">
      <section>
        <h2>Songs</h2>
      {songList}
      </section>
      {this.renderMySongs()}
    </section>
  }

  renderRecent() {
    if (!this.state.songs) {
      return <div className="page_container">Loading...</div>
    }

    let songList

    if (this.state.songs.length) {
      songList = <ul className="song_cell_list">{this.state.songs.map(song =>
        <li key={song.id}>
          <SongCell song={song} key={song.id}/>
        </li>
      )}</ul>
    } else {
      songList = <p className="empty_message">No results</p>
    }

    return <section className="content_column">
      <section>
        <h2>Recently played</h2>
        {songList}
      </section>
    </section>
  }

  render() {
    return <div className="songs_page has_sidebar">
      {this.renderSidebar()}
      <Switch>
        <Route exact path="/play-along" render={() => this.renderOverview()}></Route>
        <Route exact path="/play-along/recent" render={() => this.renderRecent()}></Route>
        <Route>
          <div className="page_container">
            <h2>Not found</h2>
            <p>Invalid filter</p>
          </div>
        </Route>
      </Switch>
    </div>
  }
}
