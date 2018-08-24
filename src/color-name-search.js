'use strict'

const unidecode = require('unidecode')
const Color = require('color')
const namedColors = require('color-name-list')
let colorOctree = require('color-octree') // todo ktree
colorOctree.add(namedColors)

const nameToColor = createNameToColor(namedColors)
function createNameToColor (namedColors) {
  let nameToColor = Object.create(null)
  namedColors.forEach(color => {
    nameToColor[slugify(color.name)] = color
  })
  return nameToColor
}

const sortedColorNames = sortByLength(Object.keys(nameToColor))
function sortByLength (names) {
  return names.sort((a, b) => Math.sign(a.length - b.length))
}

const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

// Response types
const EXACT = 0
const APPROX = 1

function * search (query) {
  const colorString = hexize(query)
  try {
    const hex = Color(colorString).hex()
    yield findClosest(hex)
  } catch (exception) {
  }
  yield * searchByName(colorString)
}

function hexize (maybeHex) {
  const matches = maybeHex.match(hexRegex)
  return matches ? '#' + matches[1] : maybeHex
}

function findClosest (hex) {
  const closestColor = colorOctree.closest(hex)
  const matchType = closestColor.d === 0 ? EXACT : APPROX
  return {
    name: closestColor.name,
    hex: closestColor.hex,
    matchType: matchType
  }
}

function * searchByName (query) {
  const slugQuery = slugify(query)

  try {
    yield findExactColorName(slugQuery)
  } catch (exception) {
  }
  yield * fuzzySearch(slugQuery)
}

function slugify (string) {
  return (unidecode(string) || string).toLowerCase()
}

function findExactColorName (query) {
  if (nameToColor[query] !== undefined) {
    const match = nameToColor[query]
    return {
      name: match.name,
      hex: match.hex,
      matchType: EXACT
    }
  }
  throw new Error(`${query} not found`)
}

function * fuzzySearch (query) {
  for (const colorName of sortedColorNames) {
    const matchIndexes = fuzzysearch(query, colorName)
    if (matchIndexes) {
      const match = nameToColor[colorName]
      yield {
        name: match.name,
        hex: match.hex,
        matchType: APPROX,
        matchIndexes: matchIndexes
      }
    }
  }
}

function fuzzysearch (needle, haystack) {
  if (needle.length > haystack.length) return false
  if (needle.length === haystack.length) return needle === haystack

  let matchIndexes = []
  outer: for (let i = 0, j = 0; i < needle.length; i++) {
    const needleCharacter = needle.charCodeAt(i)
    while (j < haystack.length) {
      if (haystack.charCodeAt(j++) === needleCharacter) {
        matchIndexes.push(j - 1)
        continue outer
      }
    }
    return false
  }
  return matchIndexes
}

module.exports = {
  EXACT,
  APPROX,
  hexize,
  findClosest,
  search,
  searchByName,
  createNameToColor,
  sortByLength
}
