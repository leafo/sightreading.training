import SongParser from "st/song_parser"

export default class SongEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
    }
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
    return <textarea className="song_editor" onChange={
      (e) => {
        let code = e.target.value
        this.setState({ code })
        this.compileSong(code)
      }
    }></textarea>
  }
}
