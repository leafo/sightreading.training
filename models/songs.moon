db = require "lapis.db"
import Model from require "lapis.db.model"
import slugify from require "lapis.util"

class Songs extends Model
  @timestamp: true

  @relations: {
    {"user", belongs_to: "Users"}
  }

  get_slug: =>
    slugify @title

