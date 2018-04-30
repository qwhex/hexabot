const Telegraf = require('telegraf')
const Color = require('color')
const namedColors = require('color-name-list')
const fuzzy = require('fuzzy')
const window = require('svgdom')
const SVG = require('svg.js')(window)
const document = window.document
const pn = require('pn/fs')
const fs = require('fs')
const svg2png = require('svg2png')

const nearestColorName = (() => {
  let colors = {}
  namedColors.forEach(color => {
    colors[color.name] = color.hex
  })
  return require('nearest-color').from(colors)
})()

const colorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

const EXACT = 0
const APPROX = 1
const INVALID = 2

function makeBot () {
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
    const colorHex = validateColor(query)

    let result
    if (colorHex === null) {
      result = searchByName(query)
    } else {
      result = searchByHex(colorHex)
    }

    makeResponse(ctx, result)
  })

  bot.startPolling()
  return bot
}

function validateColor (color) {
  const matches = color.match(colorRegex)
  return matches !== null ? matches[1] : null
}

function searchByHex (rawColorHex) {
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
  const results = fuzzy.filter(
    colorName,
    namedColors,
    { extract: (el) => el.name }
  )

  if (results[0] === undefined) {
    return [colorName, 'Invalid color', INVALID]
  }

  const match = namedColors[results[0].index]
  const matchType = match.name.toLowerCase() === colorName.toLowerCase() ? EXACT : APPROX
  return [match.hex, match.name, matchType]
}

function makeResponse (ctx, result) {
  // const senderId = ctx.message.from.id

  switch (result[2]) {
    case EXACT:
      makeImageResponse(ctx, result[0])
      return ctx.replyWithHTML(`Exact match: <b>${result[1]}</b> (${result[0]})`)
    case APPROX:
      makeImageResponse(ctx, result[0])
      return ctx.reply(`Closest match: ${result[1]} (${result[0]})`)
    case INVALID:
      return ctx.reply(`Not found: ${result[1]} (${result[0]})`)
    default:
      return ctx.reply(`🤷`)
  }
}

function makeImageResponse (ctx, colorHex) {
  const imagePath = `cache/${colorHex}.png`

  if (fs.existsSync(imagePath)) {
    return ctx.replyWithPhoto({ source: imagePath })
  }

  svg2png(generateSvg(colorHex), { width: 500, height: 500 })
    .then(buffer => {
      pn.writeFile(imagePath, buffer)
      ctx.replyWithPhoto({ source: imagePath })
    })
    .catch(e => console.error(e))
}

function generateSvg (colorHex) {
  let draw = SVG(document.documentElement).size(500, 500)
  draw.circle(400).fill(colorHex).move(50, 50)
  return draw.svg()
}

makeBot()
