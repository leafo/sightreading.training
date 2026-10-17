import {
  NATURAL_NOTES,
  SHARP_NAMES,
  FLAT_NAMES,
  STANDARD_INTERVALS,
  pitchClass,
  intervalAnswerPitch,
  enabledRootPreset,
} from "st/components/flash_cards/note_math_exercise"
import {
  CHROMATIC_NAMES,
  CSV_INTERVALS,
  noteMathCsv,
} from "st/note_math_helpers.mjs"

describe("Note Math", function() {
  it("maps standard intervals to their major or perfect half steps", function() {
    expect(STANDARD_INTERVALS.map(interval => interval.halfSteps)).toEqual([2, 4, 5, 7, 9, 11])

    for (let root of SHARP_NAMES) {
      for (let interval of STANDARD_INTERVALS) {
        expect(intervalAnswerPitch(root, interval.halfSteps)).toBe(
          (pitchClass(root) + interval.halfSteps) % 12
        )
      }
    }
  })

  it("calculates reported interval cases correctly", function() {
    expect(intervalAnswerPitch("D", 4)).toBe(pitchClass("F#"))
    expect(intervalAnswerPitch("B", 9)).toBe(pitchClass("G#"))
    expect(intervalAnswerPitch("A#", 7)).toBe(pitchClass("F"))
  })

  it("builds natural-only and all-root presets", function() {
    expect(Object.keys(enabledRootPreset(NATURAL_NOTES))).toEqual(NATURAL_NOTES)
    expect(Object.keys(enabledRootPreset(SHARP_NAMES))).toEqual(SHARP_NAMES)
  })

  it("supports sharp and flat spellings for all twelve pitch classes", function() {
    expect(SHARP_NAMES.map(pitchClass)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(FLAT_NAMES.map(pitchClass)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it("generates the verification CSV in the requested order", function() {
    let rows = noteMathCsv().split("\n").map(row => row.split(","))
    expect(rows[0]).toEqual(["Root", ...CSV_INTERVALS.map(interval => interval.label)])
    expect(rows.slice(1).map(row => row[0])).toEqual(CHROMATIC_NAMES)
    expect(rows.length).toBe(13)
    expect(rows.every(row => row.length == 17)).toBe(true)
  })
})
