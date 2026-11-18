import * as React from "react"
import * as types from "prop-types"
import {tabNavigationIndex} from "st/tab_navigation"

import styles from "./tabs.module.css"

export default class Tabs extends React.Component {
  static propTypes = {
    currentTab: types.string,
    onChangeTab: types.func,
    tabs: types.array.isRequired
  }

  currentTab() {
    let found
    if (this.props.currentTab) {
      found = this.props.tabs.find(opt => opt.name == this.props.currentTab)
    }

    return found
  }

  render() {
    let currentTab = this.currentTab()
    return <ul className={styles.tabs_component} role="tablist" aria-label={this.props.ariaLabel || "Views"}>
      {this.props.tabs.map((opt, idx) => {
        return <li key={`tab-${idx}`} role="presentation">
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === opt}
            tabIndex={currentTab === opt || !currentTab && idx === 0 ? 0 : -1}
            onKeyDown={event => {
              const next = tabNavigationIndex(event.key, idx, this.props.tabs.length)
              if (next === null) return
              event.preventDefault()
              this.props.onChangeTab?.(this.props.tabs[next])
              event.currentTarget.closest('[role="tablist"]').querySelectorAll('[role="tab"]')[next].focus()
            }}
            onClick={e => {
              if (this.props.onChangeTab) {
                this.props.onChangeTab(opt)
              }
            }}
          >{opt.label || opt.name}</button>
        </li>
      })}
    </ul>
  }
}
