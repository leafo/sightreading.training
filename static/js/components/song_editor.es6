import * as React from "react"
import SongParser from "st/song_parser"

import {JsonForm, TextInputRow} from "st/components/forms"

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentSong: this.props.currentSong,
      loading: false,

      title: "",
      code: this.props.code || "",
      source: "",
      album: "",
      artist: "",
    }
  }

  componentDidMount() {
    if (this.props.songId) {
      this.loadSong(this.props.songId)
    }
  }

  loadSong(songId) {
    if (this.state.loading) {
      return
    }

    this.setState({ loading: true })

    let request = new XMLHttpRequest()
    request.open("GET", `/songs/${songId}.json`)
    request.send()

    request.onload = (e) => {
      let res = JSON.parse(request.responseText)
      console.warn(res.song)
      this.setState({
        loading: false,
        song: res.song,
        code: res.song.song,
        title: res.song.title,
      })
    }
  }

  beforeSubmit() {
    this.setState({
      errors: null,
    })
  }

  afterSubmit(res) {
    if (res.errors) {
      this.setState({
        errors: res.errors
      })
    }

    this.setState({
      song: res.song
    })
  }

  compileSong(code) {
    let song = null

    try {
      song = SongParser.load(code, this.props.parserParams)
    } catch(err) {
      console.error(err.message)
      if (this.props.onError) {
        this.props.onError(err.message)
      }
    }

    if (song && this.props.onSong) {
      this.props.onSong(song, code)
    }
  }

  render() {
    let action = "/songs.json"
    if (this.state.song) {
      action = `/songs/${this.state.song.id}.json`
    }

    let errors

    if (this.state.errors) {
      errors = <ul>{this.state.errors.map(e => <li key={e}>{e}</li>)}</ul>
    }

    return <JsonForm action={action} beforeSubmit={this.beforeSubmit.bind(this)} afterSubmit={this.afterSubmit.bind(this)} className="song_editor">
      <textarea
        disabled={this.state.loading}
        name="song[song]"
        value={this.state.code}
        onChange={
          (e) => {
            let code = e.target.value
            this.setState({ code })
            this.compileSong(code)
          }
        }></textarea>

      <div className="song_editor_tools">
        {errors}
        {this.textInput("Title", "title")}
        {this.textInput("Source", "source")}
        {this.textInput("Artist", "artist")}
        {this.textInput("Album", "album")}

        <div className="input_row">
          <button>Save</button>
        </div>
      </div>

    </JsonForm>
  }

  textInput(title, field) {
    return <TextInputRow
      disabled={this.state.loading}
      onChange={e => this.setState({
        [field]: e.target.value
      })}
      value={this.state[field]}
      name={`song[${field}]`}
      >{title}</TextInputRow>
  }
}
