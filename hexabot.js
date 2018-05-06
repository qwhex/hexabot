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
    await next()
    console.log(ctx.message)
  })

  bot.catch(err => logError(err))

  bot.on('text', ctx => {
    const query = ctx.message.text
    makeResponse(ctx, understandColor(query))
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

function understandColor (colorString) {
  try {
    return findColorMatch(Color('#' + hexize(colorString)))
  } catch (error) {
    return searchByName(colorString)
  }
}

function hexize (possibleHex) {
  const matches = possibleHex.match(colorRegex)
  return matches !== null ? matches[1] : possibleHex
}

function logError (error) {
  console.error('Oops', error)
}

function findColorMatch (color) {
  const colorHex = colorToHex(color)

  const exactMatch = namedColors.find(color => color.hex === colorHex)
  if (exactMatch !== undefined) {
    return [EXACT, exactMatch.name, colorHex]
  }

  const approxMatch = nearestColorName(colorHex)
  return [APPROX, approxMatch.name, approxMatch.value]
}

function searchByName (colorName) {
  const results = fuzzy.filter(
    colorName,
    namedColors,
    { extract: el => el.name }
  )

  if (results[0] === undefined) {
    return [INVALID, colorName, '']
  }

  // Todo return results array > map exact, approx into it
  const match = namedColors[results[0].index]
  const matchType = match.name.toLowerCase() === colorName.toLowerCase() ? EXACT : APPROX
  return [matchType, match.name, match.hex]
}

function extractColors (ctx, imgPath) {
  let img = new Image()
  img.src = fs.readFileSync(imgPath)

  const extractedColors = Colibri.extractImageColors(img, 'css')
  for (let contentColor of extractedColors.content.slice(0, 6)) {
    makeResponse(ctx, findColorMatch(Color(contentColor)))
  }
}

function makeResponse (ctx, result) {
  const [matchType, colorName, colorHex] = result
  switch (matchType) {
  case EXACT:
    makeImageResponse(ctx, result)
    return ctx.reply(`Exact match: ${colorName} ${colorHex}`)
  case APPROX:
    makeImageResponse(ctx, result)
    return ctx.reply(`Closest match: ${colorName} ${colorHex}`)
  case INVALID:
    return ctx.reply(`🤷  ${colorName} ${colorHex}  🤷`)
  default:
    return ctx.reply(`wtf`)
  }
}

function makeImageResponse (ctx, result) {
  const [colorName, colorHex] = result.slice(1, 3)
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

  if (color.contrast(negatedColor) >= 5) {
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
  const grayscaleHex = colorToHex(color.desaturate(1))

  draw.rect(50, Math.round((hsl[0] / 360) * height))
    .fill(draw.gradient('linear', function (stop) {
      stop.at(0, colorToHex(color.negate()))
      stop.at(1, colorHex)
    }).from(0, 0).to(0, 1))
    .move(550, 375)
  draw.rect(50, Math.round((hsl[1] / 100) * height))
    .fill(draw.gradient('linear', function (stop) {
      stop.at(0, grayscaleHex)
      stop.at(1, colorHex)
    }).from(0, 0).to(0, 1))
    .move(650, 375)
  draw.rect(50, Math.round((hsl[2] / 100) * height))
    .fill(draw.gradient('linear', function (stop) {
      stop.at(0, '#000')
      stop.at(1, grayscaleHex)
    }).from(0, 0).to(0, 1))
    .move(750, 375)

  return draw
}

function colorToHex (color) {
  const [r, g, b] = color.rgb().array()
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

makeBot()
