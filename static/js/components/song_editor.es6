import * as React from "react"
import SongParser from "st/song_parser"
import {trigger} from "st/events"

import {JsonForm, TextInputRow} from "st/components/forms"
import {withRouter} from "react-router"

import Lightbox from "st/components/lightbox"
import Tabs from "st/components/tabs"
import Select from "st/components/select"

import {readConfig, writeConfig} from "st/config"

class DeleteSongForm extends React.Component {
  afterSubmit(res) {
    this.props.lightbox.close()
    if (res.redirect_to) {
      this.history.push(res.redirect_to)
    }
  }

  render() {
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
    </JsonForm>
  }
}

class SongDetailsLightbox extends Lightbox {
  constructor(opts) {
    super(opts)
    this.state = { tab: "details" }
  }

  renderContent() {
    return <React.Fragment>
      <h2>More options</h2>
      <Tabs
        currentTab={this.state.tab}
        onChangeTab={t => this.setState({tab: t.name})}
        tabs={[
          {name: "details", label: "Details"},
          {name: "delete", label: "Delete"},
        ]}
      />
      {this.renderCurrentTab()}
    </React.Fragment>
  }

  renderCurrentTab() {
    switch (this.state.tab) {
      case "details":
        return this.renderDetails()
      case "delete":
        return <DeleteSongForm lightbox={this} action={this.props.action}/>
    }
  }

  renderDetails() {
    return<div>
      <p>
        <strong>Created at: </strong>
        {this.props.song.created_at}
      </p>

      <p>
        <strong>Updated at: </strong>
        {this.props.song.updated_at}
      </p>
    </div>
  }
}

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)

    let song = this.props.song

    this.notesCountInputRef = React.createRef()
    this.beatsLengthInputRef = React.createRef()

    this.fieldUpdaters = {
      code: e => {
        let code = e.target.value
        let update = { code }
        this.setState(update)
        this.updateWip(update)

        if (this.props.onCode) {
          this.props.onCode(code)
        }
      }
    }

    let initial = song
    if (!song) {
      initial = readConfig("wip:newSong")
      // render the initial song
      if (initial) {
        window.setTimeout(() => {
          if (this.state.code == initial.code) {
            if (this.props.onCode) {
              this.props.onCode(initial.code)
            }
          }
        }, 0)
      }
    }

    this.state = {
      song,
      newSong: !song,
      loading: false,

      title: initial ? initial.title : "",
      code: this.props.code || (initial ? initial.code : null) || "",
      source: initial ? initial.source : "",
      album: initial ? initial.album : "",
      artist: initial ? initial.artist : "",
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
        newSong: false,
        song: res.song
      })
      writeConfig("wip:newSong", undefined)
    }
  }

  updateWip(update) {
    if (!this.state.newSong) {
      return false
    }

    let wip = readConfig("wip:newSong") || {}
    wip = Object.assign({}, wip, update)
    writeConfig("wip:newSong", wip)
    return true
  }

  render() {
    let action = "/songs.json"
    if (this.state.song && this.state.song.allowed_to_edit) {
      action = `/songs/${this.state.song.id}.json`
    }

    let errors

    if (this.state.errors) {
      errors = <ul>{this.state.errors.map(e => <li key={e}>{e}</li>)}</ul>
    }

    let moreButton, saveButton

    if (this.state.song && this.state.song.allowed_to_edit) {
      moreButton = <button
        onClick={e => {
          trigger(this, "showLightbox",
            <SongDetailsLightbox action={action} song={this.state.song}/>)
        }}
        type="button" className="outline">More...</button>
    }

    if (this.state.song && !this.state.song.allowed_to_edit) {
      saveButton = <button>Save copy</button>
    } else if (this.state.song) {
      saveButton = <button>Save</button>
    } else {
      saveButton = <button>Save new song</button>
    }

    let originalSongIdInput

    if (this.state.song && !this.state.song.allowed_to_edit) {
      originalSongIdInput = <input type="hidden" name="song[original_song_id]" value={this.state.song.id} />
    }

    let songVisibility

    if (!this.state.song || this.state.song.allowed_to_edit) {
      songVisibility = <Select
        name="song[visibility]"
        options={[
          {value: "public", name: "Public"},
          {value: "unlisted", name: "Unlisted"},
        ]}
        />
    }

    return <JsonForm action={action} beforeSubmit={this.beforeSubmit.bind(this)} afterSubmit={this.afterSubmit.bind(this)} className="song_editor">
      <input type="hidden" ref={this.notesCountInputRef} name="song[notes_count]" />
      <input type="hidden" ref={this.beatsLengthInputRef} name="song[beats_duration]" />
      {originalSongIdInput}

      <textarea
        placeholder="Type some LML"
        disabled={this.state.loading}
        name="song[song]"
        value={this.state.code}
        onChange={this.fieldUpdaters.code}></textarea>

      <div className="song_editor_tools">
        {errors}
        {this.textInput("Title", "title", {
          required: true
        })}
        {this.textInput("Source", "source")}
        {this.textInput("Artist", "artist")}
        {this.textInput("Album", "album")}

        <div className="form_tools">
          {saveButton}
          {" "}
          {songVisibility}
          {" "}
          {moreButton}
        </div>
      </div>

    </JsonForm>
  }

  textInput(title, field, opts={}) {
    if (!this.fieldUpdaters[field]) {
      this.fieldUpdaters[field] = e => {
        let update = {
          [field]: e.target.value
        }
        this.setState(update)
        this.updateWip(update)
      }
    }

    return <TextInputRow
      required={opts.required}
      disabled={this.state.loading}
      onChange={this.fieldUpdaters[field]}
      value={this.state[field] || ""}
      name={`song[${field}]`}
      >{title}</TextInputRow>
  }
}
