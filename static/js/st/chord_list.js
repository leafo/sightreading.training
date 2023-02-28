
export default class ChordList extends Array {
  constructor(chords, opts={}) {
    super()
    Object.setPrototypeOf(this, ChordList.prototype);

    if (opts.generator) {
      this.generator = opts.generator
    }

    if (chords && chords.length) {
      this.push.apply(this, chords);
    }
  }

  // TODO: there is some duplication between this and notes list

  clone() {
    // NOTE: this assumes the array holds immutable objects
    let list = new ChordList(this, {
      generator: this.generator
    })
    return list
  }


  pushRandom() {
    return this.push(this.generator.nextChord());
  }

  fillBuffer(count) {
    for (let i = 0; i < count; i++) {
      this.pushRandom();
    }
  }

  matchesHead(notes) {
    return this[0].containsNotes(notes)
  }
}


