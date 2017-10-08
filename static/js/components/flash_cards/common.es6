let {CSSTransitionGroup} = React.addons || {}

import * as React from "react"

export class CardHolder extends React.Component {
  render() {
    return <div className="card_holder">
      <CSSTransitionGroup
        component="div"
        className="transition_group"
        transitionName="show_card"
        transitionEnterTimeout={400}
        transitionLeaveTimeout={400}>
          {this.props.children}
      </CSSTransitionGroup>
    </div>
  }
}

