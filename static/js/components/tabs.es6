import * as React from "react"
import * as types from "prop-types"

import {classNames} from "lib"

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
    return <ul className="tabs_component">
      {this.props.tabs.map((opt, idx) => {
        return <li key={`tab-${idx}`}>
          <button
            type="button"
            onClick={e => {
              if (this.props.onChangeTab) {
                this.props.onChangeTab(opt)
              }
            }}
            className={classNames("tab_button", {
            active: currentTab == opt
            })}>{opt.label || opt.name}</button>
        </li>
      })}
    </ul>
  }
}
