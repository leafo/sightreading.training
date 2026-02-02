import * as React from "react"
import {NavLink, Route, Outlet, Navigate} from "react-router-dom"
import classNames from "classnames"
import {setTitle} from "st/globals"
import * as types from "prop-types"

import {toggleActive} from "st/components/util"

import styles from "./guide_pages.module.css"
import pageContainerStyles from "../page_container.module.css"

export class GuideContents extends React.PureComponent {
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
      return <div>
        <section className={classNames(pageContainerStyles.page_container, styles.page_container)} dangerouslySetInnerHTML={{
          __html: this.state.contents
        }} />
        <section className={classNames(pageContainerStyles.page_container, styles.page_container)}>
          <a target="_blank"
            href={`https://github.com/leafo/sightreading.training/edit/master/static/guides/${this.props.pageSource}.md`}>
              Edit this page on GitHub
          </a>
        </section>
      </div>
    } else {
      return <div className={classNames(pageContainerStyles.page_container, styles.page_container, "loading_message")}>Loading...</div>
    }
  }
}

export class GuidePage extends React.PureComponent {
  render() {
    const link = (url, label) =>
      <NavLink to={url} {...toggleActive}>{label}</NavLink>

    return <main className={styles.guide_page}>
      <section className={styles.page_navigation}>
        <section>
          <div className={styles.nav_header}>Overview</div>
          <ul>
            <li>{link("/about", "About")}</li>
            <li>{link("/guide/generators", "Generators")}</li>
            <li>{link("/guide/chords", "Chords")}</li>
            <li>{link("/guide/ear-training", "Ear Training")}</li>
          </ul>
        </section>
        <section>
          <div className={styles.nav_header}>Play Along</div>
          <ul>
            <li>{link("/guide/lml", "LML")}</li>
          </ul>
        </section>
      </section>
      <Outlet />
    </main>
  }
}

export function guideRoutes() {
  return <>
    <Route path="/about" element={<GuidePage />}>
      <Route index element={<GuideContents title="About Sight Reading Trainer" pageSource="about" />}/>
    </Route>
    <Route path="/guide" element={<GuidePage />}>
      <Route path="generators" element={<GuideContents title="Sight Reading Random Notes" pageSource="generators" />} />
      <Route path="chords" element={<GuideContents title="Sight Reading Random Chords" pageSource="chord_generators" />} />
      <Route path="ear-training" element={<GuideContents title="Ear Training Tools" pageSource="ear_training" />} />
      <Route path="lml" element={<GuideContents title="Programming a song with LML" pageSource="lml" />} />

      <Route index element={<Navigate replace to="/about" />} />

      <Route path="*" element={
        <div className={classNames(pageContainerStyles.page_container, styles.page_container)}>
          <h2>Not found</h2>
          <p>Failed to find documentation page</p>
        </div>
      }/>
    </Route>
  </>
}



