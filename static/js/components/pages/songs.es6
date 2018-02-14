/*global N*/
import * as React from "react"

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
        this.setState({loading: false, songs: res.songs || []})
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

    return <div className="songs_page page_container">
      <h2>Songs</h2>
      <ul>{this.state.songs.map(song =>
        <li key={song.id}>{song.title} from {song.user.name}</li>
      )}</ul>
    </div>
  }
}
