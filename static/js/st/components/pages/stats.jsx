import * as React from "react"
import {setTitle} from "st/globals"

import { startOfDay, format as formatDate, addDays, parseISO } from "date-fns"
import { zonedTimeToUtc } from "date-fns-tz"

import {Line} from "react-chartjs-2";

import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement
} from "chart.js"

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement);

import {getSession} from "st/app"

export default class StatsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    setTitle("Stats")

    const session = getSession()

    if (!session.currentUser) {
      this.props.router.push("/")
    } else {
      this.loadStats()
    }
  }

  componentWillUnmount() {
    if (this.request) {
      this.request.abort()
      delete this.request
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
      delete this.request
      try {
        let res = JSON.parse(request.responseText)
        this.setState({loading: false, stats: res.stats || []})
      } catch (e) {
        this.setState({loading: false, error_message: "Failed to fetch stats"})
      }
    }

    if (this.request) {
      this.request.abort()
      delete this.request
    }

    this.request = request

  }

  dateStops(days=15) {
    let d = startOfDay(zonedTimeToUtc(new Date()))

    let out = []

    for (let i = 0; i < days; i++) {
      out.push(formatDate(d, "yyyy-MM-dd"))
      d = addDays(d, -1)
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

    let options = {
      scales: {
        y: {
          stacked: true
        }
      }
    }

    let data = {
      labels: stops.map((v, i) => {
        if (i % 2 == 0) { return formatDate(parseISO(v), "M/dd") }
        return ""
      }),
      datasets: [
        {
          label: "Misses",
          data: misses,
          backgroundColor: "rgba(251,145,117,0.1)",
          borderColor: "rgba(251,145,117,0.8)",
        },
        {
          label: "Hits",
          data: hits,
          backgroundColor: "rgba(170,218,128,0.1)",
          borderColor: "rgba(170,218,128,0.8)",
        },
      ]
    }

    return <div>
      <h2>Daily stats</h2>
      <Line data={data} options={options} width={600} height={300} />
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
