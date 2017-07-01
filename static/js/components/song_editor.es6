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

  afterSubmit(res) {
    console.log("got response", res)
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
      let action = `/songs/${this.state.song.id}.json`
    }

    return <JsonForm action={action} afterSubmit={this.afterSubmit.bind(this)} className="song_editor">
      <div className="song_editor_tools">
        <TextInputRow name="song[title]">Title</TextInputRow>
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
