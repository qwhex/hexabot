const Telegraf = require('telegraf')
const Color = require('color')
const namedColors = require('color-name-list')
const fuzzy = require('fuzzy')

function createSearchHex () {
  let colors = {}
  namedColors.forEach(color => {
    colors[color.name] = color.hex
  })
  return require('nearest-color').from(colors)
}

const nearestColorName = createSearchHex()
const colorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

const EXACT = 0
const APPROX = 1

function validateColor (color) {
  const matches = color.match(colorRegex)
  return matches !== null ? matches[1] : null
}

function searchByHex (rawColor) {
  let rawColorHex = validateColor(rawColor)
  if (rawColorHex === null) {
    return searchByName(rawColor)
  }

  const color = Color('#' + rawColorHex)

  const [r, g, b] = color.rgb().array()
  const colorHex = rgbToHex(r, g, b)

  const exactMatch = namedColors.find(color => color.hex === colorHex)
  if (exactMatch !== undefined) {
    return [colorHex, exactMatch.name, EXACT]
  }

  const approxMatch = nearestColorName(colorHex)
  return [approxMatch.value, approxMatch.name, APPROX]
}

function rgbToHex (r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function searchByName (colorName) {
  const results = fuzzy.filter(colorName, namedColors, {
    extract: function (el) { return el.name }
  })

  const match = namedColors[results[0].index]

  return [
    match.hex,
    match.name,
    match.name.toLowerCase() === colorName.toLowerCase() ? EXACT : APPROX
  ]
}

const bot = new Telegraf(process.env.HEXABOT_KEY)

bot.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`Response time ${ms}ms`, ctx.message)
})

bot.catch((err) => {
  console.log('Ooops', err)
})

bot.on('text', (ctx) => {
  const query = ctx.message.text
  const result = searchByHex(query)
  switch (result[2]) {
    case EXACT:
      return ctx.replyWithHTML(`Exact match: <b>${result[1]}</b> (${result[0]})`)
    case APPROX:
      return ctx.reply(`Closest match: ${result[1]} (${result[0]})`)
    default:
      return ctx.replyWithPhoto({
        url: 'https://picsum.photos/200/300/?random',
        filename: 'kitten.jpg'
      })
  }
})

bot.startPolling()
