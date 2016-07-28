let {Link} = ReactRouter

class StatsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.loadStats()
  }

  loadStats() {
    this.setState({
      loading: true,
      error_message: undefined,
      stats: undefined
    })

    let request = new XMLHttpRequest()
    request.open("GET", "/stats.json")
    request.send()
    request.onload = (e) => {
      try {
        let res = JSON.parse(request.responseText)
        this.setState({loading: false, stats: res.stats})
      } catch (e) {
        this.setState({loading: false, error_message: "Failed to fetch stats"})
      }
    }
  }

  render() {
    let inside

    if (this.state.stats) {
      inside = <pre>{JSON.stringify(this.state.stats)}</pre>
    } else {
      inside = "Loading stats"
    }

    return <div className="stats_page page_container">{inside}</div>
  }
}
