import * as React from "react"

import {setTitle} from "st/globals"

export default class NotFoundPage extends React.PureComponent {
  componentDidMount() {
    setTitle("Not Found")
  }

  render() {
    return <div className="not_found_page page_container">
      <h2>Not found</h2>
      <p>The URL you requested doesn't exist.</p>
    </div>
  }
}
