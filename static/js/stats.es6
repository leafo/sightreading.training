export class NoteStats {
  constructor() {
    this.noteHitStats = {};
    this.streak = 0;
    this.hits = 0;
    this.misses = 0;

    this.lastHitTime = undefined;
    this.averageHitTime = 0;

    this.resetBuffer()
  }

  resetBuffer() {
    this.buffer = {
      hits: 0,
      misses: 0,
    }
  }

  hitNotes(notes) {
    for (let note of notes) {
      this.incrementNote(note, 1);
    }

    let now = +new Date;

    if (this.lastHitTime) {
      let timeTaken = now - this.lastHitTime;

      if (!this.isOutlierTime(timeTaken)) {
        this.averageHitTime = (this.averageHitTime * this.hits + timeTaken) / (this.hits + 1);
        for (let note of notes) {
          let noteStats = this.noteHitStats[this.normalizeNote(note)];
          noteStats.averageHitTime = ((noteStats.averageHitTime || 0) * (noteStats.hits || 0) + timeTaken) / (noteStats.hits + 1);
        }
      }
    }

    this.lastHitTime = now

    this.streak += 1;
    this.hits += 1;
    this.buffer.hits += 1;
  }

  missNotes(notes) {
    for (let note of notes) {
      this.incrementNote(note, -1);
    }

    this.streak = 0;
    this.misses += 1;
    this.buffer.misses += 1;
  }

  incrementNote(note, val) {
    note = this.normalizeNote(note);
    let stats = this.noteHitStats[note] = this.noteHitStats[note] || {};

    if (val > 0) {
      stats.hits = (stats.hits || 0) + val;
    } else if (val < 0){
      stats.misses = (stats.misses || 0) - val;
    }
  }

  flushLater() {
    this.flushLater = _.throttle(this.flush.bind(this), 2000, { leading: true })
    window.addEventListener("beforeunload", () => {
      this.flush()
    })
  }

  flush() {
    let d = new FormData()
    d.append("csrf_token", N.csrf_token())
    d.append("stats", JSON.stringify(this.buffer))

    var request = new XMLHttpRequest()
    request.open("POST", "/hits.json")
    request.send(formData)
    this.resetBuffer()
  }

  isOutlierTime(timeTaken) {
    if (this.averageHitTime == 0) {
      return false;
    }

    return timeTaken > this.averageHitTime * 10 + 1000;
  }

  normalizeNote(note) {
    return note.replace(/\d+$/, "");
  }
}
