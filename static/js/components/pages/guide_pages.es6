import * as React from "react"
import {NavLink, Switch, Route} from "react-router-dom"
import {setTitle} from "st/globals"
import * as types from "prop-types"

class GuideContents extends React.PureComponent {
  static propTypes = {
    title: types.string.isRequired,
    pageSource: types.string.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.loadPage()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.pageSource != this.props.pageSource) {
      this.loadPage()
    }
  }

  loadPage() {
    if (this.request) {
      this.request.abort()
      delete this.request
    }

    setTitle(this.props.title)

    const request = new XMLHttpRequest()
    const url = `/static/guides/${this.props.pageSource}.json`
    request.open("GET", url)
    request.send()

    request.onload = (e) => {
      if (request.status != 200) {
        console.error("Failed to load guide page", url)
        this.setState({
          contents: "Failed to load guide page. Check console."
        })
        return
      }

      let res = JSON.parse(request.responseText)
      this.setState({
        contents: res.contents
      })
    }

    this.request = request
  }

  componentWillUnmount() {
    if (this.request) {
      this.request.abort()
      delete this.request
    }
  }

  render() {
    if (this.state.contents) {
      return <section className="page_container" dangerouslySetInnerHTML={{
        __html: this.state.contents
      }} />
    } else {
      return <div className="page_container loading_message">Loading...</div>
    }
  }
}

export default class GuidePage extends React.PureComponent {
  render() {
    const link = (url, label) =>
      <NavLink activeClassName="active" to={url}>{label}</NavLink>

    return <main className="guide_page">
      <section className="page_navigation">
        <section>
          <div className="nav_header">Overview</div>
          <ul>
            <li>{link("/about", "About")}</li>
            <li>{link("/guide/generators", "Generators")}</li>
            <li>{link("/guide/chords", "Chords")}</li>
            <li>{link("/guide/ear-training", "Ear Training")}</li>
          </ul>
        </section>
        <section>
          <div className="nav_header">Play Along</div>
          <ul>
            <li>{link("/guide/lml", "LML")}</li>
          </ul>
        </section>
      </section>
      <Switch>
        <Route exact path="/about">
          <GuideContents title="About Sight Reading Trainer" pageSource="about" />
        </Route>

        <Route exact path="/guide/generators">
          <GuideContents title="Sight Reading Random Notes" pageSource="generators" />
        </Route>

        <Route exact path="/guide/chords">
          <GuideContents title="Sight Reading Random Chords" pageSource="chord_generators" />
        </Route>

        <Route exact path="/guide/ear-training">
          <GuideContents title="Ear Training Tools" pageSource="ear_training" />
        </Route>

        <Route exact path="/guide/lml">
          <GuideContents title="Programming a song with LML" pageSource="lml" />
        </Route>

        <Route>
          <div className="page_container">
            <h2>Not found</h2>
            <p>Failed to find documentation page</p>
          </div>
        </Route>
      </Switch>
    </main>
  }
}

