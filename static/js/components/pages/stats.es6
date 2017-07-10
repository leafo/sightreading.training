/*global N*/

import * as React from "react"
import {moment, chartjs} from "lib"
import {setTitle} from "st/globals"

let {Line: LineChart} = chartjs

export default class StatsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    setTitle("Stats")

    if (!N.session.currentUser) {
      this.props.router.push("/")
    } else {
      this.loadStats()
    }
  }

  loadStats() {
    this.setState({
      loading: true,
      error_message: undefined,
      stats: undefined
    })

    let request = new XMLHttpRequest()
    let offset = new Date().getTimezoneOffset()
    request.open("GET", `/stats.json?offset=${offset}`)
    request.send()
    request.onload = (e) => {
      try {
        let res = JSON.parse(request.responseText)
        this.setState({loading: false, stats: res.stats || []})
      } catch (e) {
        this.setState({loading: false, error_message: "Failed to fetch stats"})
      }
    }
  }

  dateStops(days=15) {
    let d = moment().utc().startOf("day")
    let out = []
    for (let i = 0; i < days; i++) {
      out.push(d.format("YYYY-MM-DD"))
      d.add(-1, "d")
    }

    out.reverse()
    return out
  }

  renderStats() {
    let stops = this.dateStops()
    let statsByDate = {}
    for (let stat of this.state.stats) {
      statsByDate[stat.date] = stat
    }

    let hits = []
    let misses = []

    for (let stop of stops) {
      let s = statsByDate[stop]
      if (s) {
        hits.push(s.hits)
        misses.push(s.misses)
      } else {
        hits.push(0)
        misses.push(0)
      }
    }

    let options = { }

    let data = {
      labels: stops.map((v, i) => {
        if (i % 2 == 0) { return moment(v).format("MM/DD") } 
        return ""
      }),
      datasets: [
        {
          label: "Misses",
          data: misses,
          fillColor: "rgba(251,145,117,0.1)",
          strokeColor: "rgba(251,145,117,0.8)",
          pointColor: "rgba(251,145,117,0.8)",
        },
        {
          label: "Hits",
          data: hits,
          fillColor: "rgba(170,218,128,0.1)",
          strokeColor: "rgba(170,218,128,0.8)",
          pointColor: "rgba(170,218,128,0.8)",
        },
      ]
    }

    return <div>
      <h2>Daily stats</h2>
      <LineChart data={data} options={options} width="600" height="300" />
    </div>
  }

  render() {
    let inside

    if (this.state.stats) {
      inside = this.renderStats()
    } else {
      inside = "Loading stats"
    }

    return <div className="stats_page page_container">{inside}</div>
  }
}
