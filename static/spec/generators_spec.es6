
import "jasmine_boot"
import {ShapeGenerator, Generator} from "st/generators"

describe("generators", function() {
  describe("shape generators", function() {
    it("gets inversions of triad", function() {
      let g = new ShapeGenerator()
      expect(g.inversions([0, 2, 4])).toEqual([
        [0, 2, 4],
        [0, 2, 5],
        [0, 3, 5],
      ])
    })


    it("gets inversions of triad out of order", function() {
      let g = new ShapeGenerator()
      expect(g.inversions([4, 0, 2])).toEqual([
        [0, 2, 4],
        [0, 2, 5],
        [0, 3, 5],
      ])
    })

    it("gets inversions of seven", function() {
      let g = new ShapeGenerator()
      expect(g.inversions([0, 2, 4, 6])).toEqual([
        [0, 2, 4, 6],
        [0, 2, 4, 5],
        [0, 2, 3, 5],
        [0, 1, 3, 5],
      ])
    })

  })

  describe("smoothing", function() {
    it("ranks notes using individual minimizer", function() {
      let g = new Generator()
      g.lastNotes = ["C3", "C6"]

      let k = 0
      let available = [
        ["A2", "D6"],
        ["D3", "D6"],
      ]

      let nextNote = () => available[(k++) % available.length]
      let res = g.sortedCandidatesIndividual(2, nextNote)
      expect(res).toEqual([
        [4, available[1]],
        [5, available[0]],
      ])
    })
  })
})

