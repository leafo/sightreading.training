import * as React from "react"
import * as types from "prop-types"

export class IconBase extends React.PureComponent {
  static propTypes = {
    width: types.number,
    height: types.number,
  }

  render() {
    let width = this.props.width || this.width
    let height = this.props.height || width / this.width * this.height

    return <svg
      {...this.svgOpts || {}}
      viewBox={`0 0 ${this.width} ${this.height}`}
      aria-hidden="true"
      width={width}
      height={height}
      className="svgicon"
      role="img"
      version="1.1"
      dangerouslySetInnerHTML={{
          __html: this.path
      }}
      />
  }
}

export class IconDownArrow extends IconBase {
  width = 37
  height = 20
  path = `<path d="m2.0858 0c-1.1535 0-2.0858 0.86469-2.0858 1.9331 0 0.5139 0.21354 1.0183 0.38704 1.1881l18.113 16.879 18.112-16.879c0.174-0.1696 0.388-0.674 0.388-1.1879 0-1.0684-0.932-1.9331-2.086-1.9331-0.577 0-1.111 0.23008-1.49 0.57992l-14.924 13.894-14.925-13.893c-0.3777-0.34998-0.9134-0.581-1.4902-0.581z"/>`
}

export class IconRewind extends IconBase {
  width = 512
  height = 512
  path = `<path d="M128 448v-384h64v176l160-160v352l-160-160v176z" />`
}

export class IconShuffle extends IconBase {
  width = 24
  height = 24
  svgOpts = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }

  path = `<polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>`
}

export class IconMenu extends IconBase {
  width = 24
  height = 24

  svgOpts = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }

  path = `<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>`
}



