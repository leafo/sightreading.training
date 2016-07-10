import Flow from require "lapis.flow"

class FormatterFlow extends Flow
  user: (user) =>
    {
      id: user.id
      username: user.username
    }


