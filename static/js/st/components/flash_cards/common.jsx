import {TransitionGroup, CSSTransition} from "react-transition-group"

import * as React from "react"

export class CardHolder extends React.Component {
  render() {
    // render nothing if no card is provided
    if (!this.props.children) {
      return
    }

    return <div className="card_holder">
      <TransitionGroup component="div" className="transition_group">
        {this.cardAnimation(this.props.children)}
      </TransitionGroup>
    </div>
  }

  cardAnimation(card) {
    if (card.key == null) {
      throw new Error("Card should have key for card holder")
    }

    return <CSSTransition key={card.key} classNames="show_card" timeout={{enter: 400, exit: 400}}>
      {card}
    </CSSTransition>
  }
}

