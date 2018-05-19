module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "standard",
  "rules": {
    "one-var": "off",
    "no-var": "error",
    "max-len": [
      "warn", 120
    ],
    "id-length": [
      "error", {
        "min": 2,
        "max": 20,
        "exceptions": ["i", "a", "n", "r", "g", "b"]
      }
    ],
    "array-bracket-spacing": [
      "error", "never"
    ],
    "arrow-parens": [
      "error", "as-needed"
    ],
    "arrow-spacing": [
      "error", {
        "after": true,
        "before": true
      }
    ],
    "callback-return": "off", //?
    "camelcase": "error",
    "capitalized-comments": "warn",
    "class-methods-use-this": "error",
    "comma-dangle": "error",
    "comma-spacing": [
      "error", {
        "after": true,
        "before": false
      }
    ],
    "indent": ["error", 2]
  }
};
