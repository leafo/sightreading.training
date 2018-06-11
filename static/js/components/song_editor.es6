import * as React from "react"
import SongParser from "st/song_parser"
import {trigger} from "st/events"

import {JsonForm, TextInputRow} from "st/components/forms"
import {withRouter} from "react-router"

import Lightbox from "st/components/lightbox"

class DeleteSongConfirmLightbox extends Lightbox {
  afterSubmit(res) {
    this.close()
    if (res.redirect_to) {
      this.history.push(res.redirect_to)
    }
  }

  renderContent() {
    // TODO: this is gross
    let Router = withRouter(({history}) => {
      this.history = history
      return null
    })

    return <JsonForm
      method="DELETE"
      action={this.props.action}
      afterSubmit={this.afterSubmit.bind(this)}
      className="delete_song_form">
        <Router/>
        <p>Are you sure you want to delete this song? You can't un-delete</p>
        <button>Delete</button>
        {" "}
        <button className="outline" type="button" onClick={this.close.bind(this)}>Cancel</button>
    </JsonForm>
  }
}

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)

    let song = this.props.song

    this.notesCountInputRef = React.createRef()
    this.beatsLengthInputRef = React.createRef()

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
    if (this.props.songNotes) {
      this.notesCountInputRef.current.value = this.props.songNotes.length
      let duration = Math.max(...this.props.songNotes.map((n) => n.getStop()))
      this.beatsLengthInputRef.current.value = duration
    }

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

    if (res.song) {
      this.setState({
        song: res.song
      })
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

    let deleteButton

    if (this.state.song) {
      deleteButton = <button
        onClick={e => {
          trigger(this, "showLightbox",
            <DeleteSongConfirmLightbox action={action} song={this.props.song}/>)
        }}
        type="button" className="outline">Delete...</button>
    }

    return <JsonForm action={action} beforeSubmit={this.beforeSubmit.bind(this)} afterSubmit={this.afterSubmit.bind(this)} className="song_editor">
      <input type="hidden" ref={this.notesCountInputRef} name="song[notes_count]" />
      <input type="hidden" ref={this.beatsLengthInputRef} name="song[beats_duration]" />

      <textarea
        placeholder="Type some LML"
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
          {" "}
          {deleteButton}
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
      value={this.state[field] || ""}
      name={`song[${field}]`}
      >{title}</TextInputRow>
  }
}
