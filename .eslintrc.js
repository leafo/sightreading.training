module.exports = {
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "parser": "babel-eslint",
  "rules": {
    "no-console": "off",
    "no-unused-vars": "off",
    "no-empty": "off",
    "no-constant-condition": [
      "error",
      { "checkLoops": false }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "double",
      { "avoidEscape": true }
    ]
  }
};