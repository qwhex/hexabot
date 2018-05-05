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
    makeResponse(ctx, searchByHex(colorToHex(Color(contentColor)).slice(1)))
  }
}

function validateColor (color) {
  const matches = color.match(colorRegex)
  return matches !== null ? matches[1] : null
}

function searchByHex (rawColorHex) {
  const color = Color('#' + rawColorHex)
  const colorHex = colorToHex(color)

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
    makeImageResponse(ctx, result)
    return ctx.reply(`Exact match: ${result[1]} ${result[0]}`)
  case APPROX:
    makeImageResponse(ctx, result)
    return ctx.reply(`Closest match: ${result[1]} ${result[0]}`)
  case INVALID:
    return ctx.reply(`🤷 ${result[1]} ${result[0]}`)
  default:
    return ctx.reply(`🤷`)
  }
}

function makeImageResponse (ctx, result) {
  const [colorHex, colorName] = result.slice(0, 2)
  const filename = `${colorHex}.png`
  const imagePath = path.resolve(__dirname, `./cache/${filename}`)

  if (fs.existsSync(imagePath)) {
    return ctx.replyWithPhoto({
      source: imagePath,
      filename: filename,
      caption: colorName,
      reply_to_message_id: ctx.message.message_id
    })
  }

  svg2png(generateSvg(colorHex, colorName))
    .then(buffer => {
      pn.writeFile(imagePath, buffer)
        .then(() => ctx.replyWithPhoto({
          source: imagePath,
          filename: filename,
          caption: colorName,
          reply_to_message_id: ctx.message.message_id
        }))
        .catch(err => console.error(err))
    })
    .catch(err => console.error(err))
}

function generateSvg (colorHex, colorName) {
  const color = Color(colorHex)
  const bgColor = colorToHex(getBgColor(color))

  let draw = SVG(document.documentElement).size(850, 700)
  drawColorCircle(draw, colorHex, bgColor)
  drawTitle(draw, colorHex, colorName)
  drawRgbBars(draw, color)
  drawHslBars(draw, color)
  return draw.svg()
}

function getBgColor (color) {
  const negatedColor = color.negate()

  if (color.contrast(negatedColor) >= 10) {
    return negatedColor
  }

  return color.isDark() ? Color('white') : Color('black')
}

function drawColorCircle (draw, fgColorHex, bgColorHex) {
  draw.rect(950, 700).fill(bgColorHex)
  draw.circle(400).fill(fgColorHex).move(50, 150)
  return draw
}

function drawTitle (draw, fgColorHex, colorName) {
  const fontConfig = {
    fill: fgColorHex,
    family: 'Andale Mono',
    size: '40px'
  }

  let colorNameText = draw.text(colorName)
  colorNameText.move(50, 50).font(fontConfig)

  let colorHexText = draw.text(fgColorHex)
  colorHexText.move(50, 575).font(fontConfig)

  return draw
}

function drawRgbBars (draw, color) {
  const height = 275
  const rgb = color.rgb().array()
  const heights = rgb.map(attribute => {
    return Math.round((attribute / 255) * height)
  })

  draw.rect(50, heights[0])
    .fill(colorToHex(Color.rgb(rgb[0], 0, 0)))
    .move(550, 50)
  draw.rect(50, heights[1])
    .fill(colorToHex(Color.rgb(0, rgb[1], 0)))
    .move(650, 50)
  draw.rect(50, heights[2])
    .fill(colorToHex(Color.rgb(0, 0, rgb[2])))
    .move(750, 50)

  return draw
}

function drawHslBars (draw, color) {
  const height = 275
  const hsl = color.hsl().array()
  const colorHex = colorToHex(color)

  draw.rect(50, Math.round((hsl[0] / 360) * height))
    .fill(colorHex)
    .move(550, 375)
  draw.rect(50, Math.round((hsl[1] / 100) * height))
    .fill(colorHex)
    .move(650, 375)
  draw.rect(50, Math.round((hsl[2] / 100) * height))
    .fill(colorHex)
    .move(750, 375)

  return draw
}

function colorToHex (color) {
  const [r, g, b] = color.rgb().array()
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

makeBot()
