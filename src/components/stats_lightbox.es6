let {PropTypes: types} = React;

class StatsLightbox extends React.Component {
  static propTypes = {
    stats: types.object.isRequired,
    close: types.func.isRequired,
  }


  constructor(props) {
    super(props);

    this.state = {
      tab: "ratios"
    };
  }

  render() {
    let statsContent;
    let availableNotes = Object.keys(this.props.stats.noteHitStats);
    availableNotes.sort();

    if (availableNotes.length) {
      if (this.state.tab == "ratios") {
        statsContent = this.renderNoteHitRatios(availableNotes);
      } else if (this.state.tab == "timings") {
        statsContent = this.renderNoteTimings(availableNotes);
      }
    } else {
      statsContent = <p className="empty_message">
        You don't have any stats yet. Try playing some notes first.
      </p>;
    }

    if (this.props.stats.averageHitTime) {
      var hitTime = <div className="hit_time">
        Average hit time
        <strong> {Math.round(this.props.stats.averageHitTime)}ms</strong>
      </div>
    }

    return <div
      onClick={function(e) {
        if (e.target.classList.contains("lightbox_shroud")) {
          this.props.close();
          e.preventDefault();
        }
      }.bind(this)}
      className="lightbox_shroud">
      <div className="lightbox stats_lightbox">
        <h2>Session stats</h2>
        <button onClick={(e) => { this.setState({tab: "ratios"}) }}>Ratios</button>
        {" "}
        <button onClick={(e) => { this.setState({tab: "timings"}) }}>Timings</button>

        {statsContent}
        {hitTime}
        <p>
          <button onClick={this.props.close}>Close</button>
        </p>
      </div>
    </div>;
  }

  renderNoteHitRatios(availableNotes) {
    let hitStats = this.props.stats.noteHitStats;

    var statsContent = availableNotes.map(function (note) {
      let stats = hitStats[note];
      let hits = stats.hits || 0;
      let misses = stats.misses || 0;

      let hit_rate = hits / (hits + misses) * 100;
      let miss_rate = misses / (hits + misses) * 100;

      if (hit_rate > 0) {
        var hit_bar = <div className="hit_bar" style={{ width: `${hit_rate}%`}}>
          {hits}
        </div>;
      }

      if (miss_rate > 0) {
        var miss_bar = <div className="miss_bar" style={{ width: `${miss_rate}%`}}>
          {misses}
        </div>;
      }

      return <div key={note} className="note_stat_row">
        <div className="note_name">{note}</div>
        <div className="note_rates">
          {hit_bar}
          {miss_bar}
        </div>
      </div>
    }.bind(this));

    statsContent = <div className="note_bars_container">{statsContent}</div>;
    return statsContent;
  }

  renderNoteTimings(availableNotes) {
    let hitStats = this.props.stats.noteHitStats;

    var statsContent = availableNotes.map(function (note) {
      let stats = hitStats[note];
      console.log(stats);

      if (!stats.averageHitTime) {
        return;
      }


      return <div key={note} className="note_timing_row">
        <span className="note_name">{note}</span>
        <span className="note_timing">
          {Math.round(stats.averageHitTime)}ms
        </span>
      </div>;
    });

    statsContent = <div className="note_timings_container">{statsContent}</div>;
    return statsContent;
  }
}
