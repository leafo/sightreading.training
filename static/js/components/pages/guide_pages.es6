import * as React from "react"
import {Link, NavLink} from "react-router-dom"
import {setTitle} from "st/globals"
import * as types from "prop-types"

export default class GuidePage extends React.Component {
  static propTypes = {
    title: types.string.isRequired,
    pageSource: types.string.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  componentWillUnmount() {
    if (this.request) {
      this.request.abort()
      delete this.request
    }
  }

  componentDidMount() {
    setTitle(this.props.title)

    let request = new XMLHttpRequest()
    request.open("GET", `/static/guides/${this.props.pageSource}.json`)
    request.send()

    request.onload = (e) => {
      let res = JSON.parse(request.responseText)
      this.setState({
        contents: res.contents
      })
    }

    this.request = request
  }

  render() {
    const link = (url, label) =>
      <NavLink activeClassName="active" to={url}>{label}</NavLink>

    return <div className="guide_page">
      <div className="page_navigation">
        <section>
          <div className="nav_header">Overview</div>
          <ul>
            <li>{link("/about", "About")}</li>
            <li>{link("/guide/generators", "Generators")}</li>
            <li>{link("/guide/chords", "Chords")}</li>
          </ul>
        </section>
        <section>
          <div className="nav_header">Play Along</div>
          <ul>
            <li>{link("/guide/lml", "LML")}</li>
          </ul>
        </section>
      </div>
      {this.renderContents()}
    </div>
  }

  renderContents() {
    if (this.state.contents) {
      return <div className="page_container" dangerouslySetInnerHTML={{
        __html: this.state.contents
      }} />
    } else {
      return <div className="loading_message">Loading...</div>
    }

  }
}

