import * as React from "react"
import classNames from "classnames"
import {Navigate} from "react-router-dom"
import {setTitle} from "st/globals"
import {practiceRecap} from "st/share_stats"
import Toast from "st/components/toast"

import pageContainerStyles from "../page_container.module.css"
import styles from "./stats.module.css"

import { startOfDay, format as formatDate, addDays, parseISO } from "date-fns"

import {Line} from "react-chartjs-2";

import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Tooltip, Legend)

import {getSession} from "st/app"

export default class StatsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.mounted = true
    setTitle("Stats")

    const session = getSession()

    if (session.currentUser) {
      this.loadStats()
    }
  }

  componentWillUnmount() {
    this.mounted = false
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
        this.setState({loading: false, stats: res.stats || [], summary: res.summary})
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
    let d = startOfDay(new Date())

    let out = []

    for (let i = 0; i < days; i++) {
      out.push(formatDate(d, "yyyy-MM-dd"))
      d = addDays(d, -1)
    }

    out.reverse()
    return out
  }

  async copyRecap(recap) {
    let message
    try {
      await navigator.clipboard.writeText(recap)
      message = "Practice recap copied."
    } catch {
      message = "Could not copy automatically. Select and copy the recap below."
    }

    if (this.mounted) {
      this.setState(({notificationId = 0}) => ({message, notificationId: notificationId + 1}))
    }
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
        hits.push(Number(s.hits ?? 0))
        misses.push(Number(s.misses ?? 0))
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

    const recap = practiceRecap(stops, hits, misses)

    return <div>
      {this.state.summary && <section className={styles.summary} aria-label="All-time hit statistics">
        <h2>All-time hits</h2>
        <p>Best daily hits: <strong>{Number(this.state.summary.best_daily_hits).toLocaleString()}</strong></p>
        <p>Average hits per active day: <strong>{Number(this.state.summary.average_daily_hits).toLocaleString(undefined, {maximumFractionDigits: 1})}</strong></p>
        <p>Includes all recorded practice days, including days with only misses.</p>
      </section>}
      <h2>Daily stats</h2>
      <Line data={data} options={options} width={600} height={300} />
      {recap && <details className={styles.share_stats}>
        <summary>Share practice stats</summary>
        <p>Copy a recap of the 15 days shown above to share wherever you like.</p>
        <label htmlFor="practice-recap">Practice recap</label>
        <textarea id="practice-recap" rows={4} readOnly value={recap} />
        <button type="button" onClick={() => this.copyRecap(recap)}>Copy recap</button>
      </details>}
      <Toast message={this.state.message} notificationId={this.state.notificationId}
        onDismiss={() => this.setState({message: undefined})} />
    </div>
  }

  render() {
    if (!getSession().currentUser) {
      return <Navigate to="/" replace />
    }

    let inside

    if (this.state.stats) {
      inside = this.renderStats()
    } else if (this.state.error_message) {
      inside = this.state.error_message
    } else {
      inside = "Loading stats"
    }

    return <div className={classNames(styles.stats_page, pageContainerStyles.page_container)}>{inside}</div>
  }
}
