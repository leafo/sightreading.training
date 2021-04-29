module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaFeatures": {
        "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module"
  },
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