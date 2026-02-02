import * as React from "react"

import {setTitle} from "st/globals"

import pageContainerStyles from "../page_container.module.css"

export default class NotFoundPage extends React.PureComponent {
  componentDidMount() {
    setTitle("Not Found")
  }

  render() {
    return <div className={`not_found_page ${pageContainerStyles.page_container}`}>
      <h2>Not found</h2>
      <p>The URL you requested doesn't exist.</p>
    </div>
  }
}
