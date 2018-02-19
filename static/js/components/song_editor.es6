import * as React from "react"
import SongParser from "st/song_parser"

import {JsonForm, TextInputRow} from "st/components/forms"

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)

    let song = this.props.song

    this.state = {
      song,
      loading: false,

      title: song ? song.title : "",
      code: this.props.code || "",
      source: song ? song.source : "",
      album: song ? song.album : "",
      artist: song ? song.artist : "",
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
            if (this.props.onCode) {
              this.props.onCode(code)
            }
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
