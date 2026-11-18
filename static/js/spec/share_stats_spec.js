import {practiceRecap} from "st/share_stats"

describe("practice recap", () => {
  const dates = ["2026-11-05", "2026-11-06", "2026-11-07"]

  it("totals the displayed period and rounds accuracy across all attempts", () => {
    expect(practiceRecap(dates, [2, 0, "7"], [1, 0, 3])).toEqual([
      "My Napland Music Tools practice recap",
      "2026-11-05 to 2026-11-07",
      "9 hits · 4 misses · 69% accuracy",
    ].join("\n"))
  })

  it("shares misses-only practice but hides the recap for an empty period", () => {
    expect(practiceRecap(dates, [0, 0, 0], [0, 1, 0])).toContain("0% accuracy")
    expect(practiceRecap(dates, [0, 0, 0], [0, 0, 0])).toBe("")
  })
})
