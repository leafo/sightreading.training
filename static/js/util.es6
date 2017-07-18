
import {MersenneTwister} from "lib"

export function dithered(array, e=1.5, rand) {
  if (!rand) {
    rand = new MersenneTwister()
  }

  let gn = (sd=1, mean=0) => {
    let x1, x2, w, y1, y2
    while (true) {
      x1 = 2 * rand.random() - 1
      x2 = 2 * rand.random() - 1
      w = Math.pow(x1, 2) + Math.pow(x2, 2)
      if (w < 1) {
        break
      }
    }

    w = Math.sqrt(-2 * Math.log(w) / 2)
    y1 = x1 * w
    y2 = x2 * w

    return y1 * sd + mean
  }

  let dither_score = (rank, e) =>
    Math.log(rank) + gn(Math.log(e))

  let scored = array.map((item, idx) =>
    [dither_score(idx + 1, e), item]
  )

  scored.sort((a, b) => {
    var aScore = a[0]
    var bScore = b[0]

    if (aScore == bScore) {
      return 0
    } else if(aScore < bScore) {
      return -1
    } else {
      return 1
    }
  })

  return scored.map(tuple => tuple[1])
}
