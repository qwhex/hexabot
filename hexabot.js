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

let colorOctree = require('color-octree')
colorOctree.add(namedColors)

let nameToColor = []
namedColors.forEach(color => { nameToColor[color.name.toLowerCase()] = color })

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
    respond(ctx, understandColor(query))
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
    return findClosestColor(Color('#' + hexize(colorString)))
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

function findClosestColor (color) {
  const colorHex = rgbToHex(color.rgb().array())
  const closestColor = colorOctree.closest(colorHex)
  const matchType = closestColor.d === 0 ? EXACT : APPROX
  return [matchType, closestColor.name, closestColor.hex]
}

function searchByName (colorName) {
  const lowerCaseName = colorName.toLowerCase() // Todo unidecode
  if (nameToColor[lowerCaseName] !== undefined) {
    const color = nameToColor[lowerCaseName]
    return [EXACT, color.name, color.hex]
  }

  const results = fuzzy.filter(
    lowerCaseName,
    namedColors,
    { extract: el => el.name }
  )
  // Todo cross-reference with word usage data / prefer shorter names

  if (results[0] === undefined) {
    return [INVALID, colorName, '']
  }

  // Todo return results array
  const match = namedColors[results[0].index]
  return [APPROX, match.name, match.hex]
}

function extractColors (ctx, imgPath) {
  let img = new Image()
  img.src = fs.readFileSync(imgPath)

  const extractedColors = Colibri.extractImageColors(img, 'css')
  for (let contentColor of extractedColors.content.slice(0, 6)) {
    respond(ctx, findClosestColor(Color(contentColor)))
  }
}

function respond (ctx, result) {
  const [matchType, colorName, colorHex] = result

  const colorInfo = getInfoString(colorName, colorHex)

  switch (matchType) {
  case EXACT:
    respondWithImage(ctx, result)
    return ctx.reply(`${colorInfo}`)
  case APPROX:
    respondWithImage(ctx, result)
    return ctx.reply(`Closest match:\n\n${colorInfo}`)
  case INVALID:
    return ctx.reply(`🤷  ${colorName} ${colorHex}  🤷`)
  default:
    return ctx.reply(`wtf`)
  }
}

function getInfoString (colorName, colorHex) {
  const color = Color(colorHex)
  const rgb = color.rgb().string()
  const hsl = color.hsl().string()
  return [colorName, colorHex, rgb, hsl].join('\n')
}

function respondWithImage (ctx, result) {
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
  const mainColor = Color(colorHex)
  const bgColor = getBgColor(mainColor)

  let draw = SVG(document.documentElement).size(850, 700)
  drawColorCircle(draw.group(), colorHex, rgbToHex(bgColor.rgb().array()))
  drawTitle(draw.group(), colorHex, colorName)
  drawRgbBars(draw.group(), mainColor)
  drawHslBars(draw.group(), mainColor)
  return draw.svg()
}

function getBgColor (color) {
  const negatedColor = color.negate()
  if (color.contrast(negatedColor) >= 5) {
    return negatedColor
  }
  return color.isDark() ? Color('white') : Color('black')
}

function drawColorCircle (group, fgColorHex, bgColorHex) {
  group.rect(950, 700).fill(bgColorHex)
  group.circle(400).fill(fgColorHex).move(50, 150)
  return group
}

function drawTitle (group, fgColorHex, colorName) {
  const fontConfig = {
    fill: fgColorHex,
    family: 'Andale Mono,monospace',
    size: '40px'
  }

  let colorNameText = group.text(colorName)
  colorNameText.move(50, 50).font(fontConfig)

  let colorHexText = group.text(fgColorHex)
  colorHexText.move(50, 575).font(fontConfig)

  return group
}

function drawRgbBars (group, mainColor) {
  const rgb = mainColor.rgb().array()
  const height = 275
  const heights = rgb.map(attribute => {
    return Math.round((attribute / 255) * height)
  })

  group.rect(50, heights[0])
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, '#000000')
      stop.at(1, rgbToHex([rgb[0], 0, 0]))
    }).from(0, 0).to(0, 1))
    .move(550, 50)
  group.rect(50, heights[1])
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, '#000000')
      stop.at(1, rgbToHex([0, rgb[1], 0]))
    }).from(0, 0).to(0, 1))
    .move(650, 50)
  group.rect(50, heights[2])
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, '#000000')
      stop.at(1, rgbToHex([0, 0, rgb[2]]))
    }).from(0, 0).to(0, 1))
    .move(750, 50)

  return group
}

function drawHslBars (group, mainColor) {
  const height = 275
  const hsl = mainColor.hsl().array()
  const rgb = mainColor.rgb().array()
  const colorHex = rgbToHex(rgb)
  const grayscaleHex = rgbToHex(mainColor.desaturate(1).rgb().array())

  group.rect(50, Math.round((hsl[0] / 360) * height))
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, rgbToHex(mainColor.negate().rgb().array()))
      stop.at(1, colorHex)
    }).from(0, 0).to(0, 1))
    .move(550, 375)
  group.rect(50, Math.round((hsl[1] / 100) * height))
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, grayscaleHex)
      stop.at(1, colorHex)
    }).from(0, 0).to(0, 1))
    .move(650, 375)
  group.rect(50, Math.round((hsl[2] / 100) * height))
    .fill(group.gradient('linear', function (stop) {
      stop.at(0, '#000')
      stop.at(1, grayscaleHex)
    }).from(0, 0).to(0, 1))
    .move(750, 375)

  return group
}

function rgbToHex (rgbArray) {
  const [r, g, b] = rgbArray
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

if (require.main === module) {
  makeBot()
}

exports.EXACT = EXACT
exports.APPROX = APPROX
exports.INVALID = INVALID
exports.rgbToHex = rgbToHex
exports.hexize = hexize
exports.findClosestColor = findClosestColor
exports.understandColor = understandColor
exports.getBgColor = getBgColor
exports.searchByName = searchByName
exports.drawColorCircle = drawColorCircle
exports.drawRgbBars = drawRgbBars
exports.drawHslBars = drawHslBars
