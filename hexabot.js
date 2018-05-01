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
const path = require('path')
const Colibri = require('colibrijs')
const Image = require('canvas').Image
const fetch = require('isomorphic-fetch')

const TOKEN = process.env.HEXA_KEY

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
  const bot = new Telegraf(TOKEN)

  bot.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log(`Response time ${ms}ms`, ctx.message)
  })

  bot.catch(err => console.error('Ooops', err))

  bot.on('text', ctx => {
    const query = ctx.message.text
    const colorHex = validateColor(query)
    const result = colorHex === null ? searchByName(query) : searchByHex(colorHex)

    makeResponse(ctx, result)
  })

  bot.on('photo', ctx => {
    const thumbnailId = ctx.message.photo[0].file_id
    const imgSavePath = path.resolve(__dirname, `./cache/img/${thumbnailId}`)

    ctx.telegram.getFileLink(thumbnailId).then(thumbnailUrl => {
      fetch(thumbnailUrl).then(image => image.body
        .pipe(fs.createWriteStream(imgSavePath))
        .on('close', () => extractColors(ctx, imgSavePath))
      )
    })
  })

  bot.startPolling()
  return bot
}

function extractColors (ctx, imgPath) {
  let img = new Image()
  img.src = fs.readFileSync(imgPath)

  const extractedColors = Colibri.extractImageColors(img, 'css')
  for (let contentColor of extractedColors.content) {
    makeResponse(ctx, searchByHex(rgbToHex(Color(contentColor)).slice()))
  }
}

function validateColor (color) {
  const matches = color.match(colorRegex)
  return matches !== null ? matches[1] : null
}

function searchByHex (rawColorHex) {
  const color = Color('#' + rawColorHex)
  const colorHex = rgbToHex(color)

  const exactMatch = namedColors.find(color => color.hex === colorHex)
  if (exactMatch !== undefined) {
    return [colorHex, exactMatch.name, EXACT]
  }

  const approxMatch = nearestColorName(colorHex)
  return [approxMatch.value, approxMatch.name, APPROX]
}

function searchByName (colorName) {
  const results = fuzzy.filter(
    colorName,
    namedColors,
    { extract: el => el.name }
  )

  if (results[0] === undefined) {
    return [colorName, 'Invalid color', INVALID]
  }

  const match = namedColors[results[0].index]
  const matchType = match.name.toLowerCase() === colorName.toLowerCase() ? EXACT : APPROX
  return [match.hex, match.name, matchType]
}

function makeResponse (ctx, result) {
  switch (result[2]) {
  case EXACT:
    makeImageResponse(ctx, result[0])
    return ctx.reply(`Exact match: ${result[1]} (${result[0]})`)
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
  const imagePath = path.resolve(__dirname, `./cache/${colorHex}.png`)

  if (fs.existsSync(imagePath)) {
    return ctx.replyWithPhoto({ source: imagePath })
  }

  svg2png(generateSvg(colorHex), { width: 500, height: 500 })
    .then(buffer => {
      pn.writeFile(imagePath, buffer)
        .then(() => ctx.replyWithPhoto({ source: imagePath }))
        .catch(err => console.error(err))
    })
    .catch(err => console.error(err))
}

function generateSvg (colorHex) {
  const color = Color(colorHex)
  const bgColor = rgbToHex(color.negate())

  let draw = SVG(document.documentElement).size(500, 500)
  draw.rect(500, 500).fill(bgColor)
  draw.circle(400).fill(colorHex).move(50, 50)
  return draw.svg()
}

function rgbToHex (color) {
  const [r, g, b] = color.rgb().array()
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

makeBot()
