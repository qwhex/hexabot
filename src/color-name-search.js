const fuzzysearch = require('fuzzysearch')
const unidecode = require('unidecode')
const Color = require('color')

const namedColors = require('color-name-list')
let colorOctree = require('color-octree') // Todo ktree
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
const INVALID = 2

function * search (query) {
  const colorString = hexize(query)
  try {
    const color = Color(colorString)
    yield findClosest(color.hex())
  } catch (exception) {
    yield * searchByName(colorString)
  }
}

function hexize (maybeHex) {
  const matches = maybeHex.match(hexRegex)
  return matches ? '#' + matches[1] : maybeHex
}

function findClosest (hex) {
  const closestColor = colorOctree.closest(hex)
  const matchType = closestColor.d === 0 ? EXACT : APPROX
  return [matchType, closestColor.name, closestColor.hex]
}

function * searchByName (query) {
  const slugQuery = slugify(query)

  try {
    yield findExactColorName(slugQuery)
  } catch (exception) {
    yield * fuzzySearch(slugQuery)
  }

  yield [INVALID, `${slugQuery} not found`, '']
}

function slugify (string) {
  return (unidecode(string) || string).toLowerCase()
}

function findExactColorName (query) {
  if (nameToColor[query] !== undefined) {
    const match = nameToColor[query]
    return [EXACT, match.name, match.hex]
  }
  throw new Error(`${query} not found`)
}

function * fuzzySearch (query) {
  for (const colorName of sortedColorNames) {
    if (fuzzysearch(query, colorName)) {
      const match = nameToColor[colorName]
      yield [APPROX, match.name, match.hex]
    }
  }
}

module.exports = {
  EXACT,
  APPROX,
  INVALID,
  hexize,
  findClosest,
  search,
  searchByName,
  createNameToColor,
  sortByLength
}
