math.randomseed os.time!

import string, unpack from _G
import random from math

random_char = ->
  switch random 1,3
    when 1
      random 65, 90
    when 2
      random 97, 122
    when 3
      random 48, 57

with M = {}
  -- lets us inject implementation
  ._generate_key = (length) -> string.char unpack [ random_char! for i=1,length ]
  .generate_key = (...) -> ._generate_key ...
