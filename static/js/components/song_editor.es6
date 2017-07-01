import * as React from "react"
import SongParser from "st/song_parser"

import {JsonForm, TextInputRow} from "st/components/forms"

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentSong: this.props.currentSong
    }
  }

  beforeSubmit() {
    this.setState({
      errors: null,
      loading: true,
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
      song = SongParser.load(code)
    } catch(err) {
      console.error(err.message)
      if (this.props.onError) {
        this.props.onError(err.message)
      }
    }

    if (song && this.props.onSong) {
      this.props.onSong(song)
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
      {errors}
      <div className="song_editor_tools">
        <TextInputRow name="song[title]">Title</TextInputRow>
        <TextInputRow name="song[source]">Source</TextInputRow>
        <TextInputRow name="song[artist]">Artist</TextInputRow>
        <TextInputRow name="song[album]">Album</TextInputRow>
      </div>

      <textarea name="song[song]" className="song_editor" onChange={
        (e) => {
          let code = e.target.value
          this.setState({ code })
          this.compileSong(code)
        }
      }></textarea>
      <div className="input_row">
        <button>Save</button>
      </div>
    </JsonForm>
  }
}
