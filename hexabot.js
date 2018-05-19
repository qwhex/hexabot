const Telegraf = require('telegraf')
const Color = require('color')
const namedColors = require('color-name-list')
const fuzzysearch = require('fuzzysearch')
const pn = require('pn/fs')
const fs = require('fs')
const svg2png = require('svg2png')
const path = require('path')
const Colibri = require('colibrijs')
const Image = require('canvas').Image
const fetch = require('isomorphic-fetch')
const unidecode = require('unidecode')
const render = require('./render')

const CACHE_ENABLED = process.env.NODE_ENV === 'production'
const TOKEN = process.env.HEXA_KEY

let colorOctree = require('color-octree') // Todo ktree
colorOctree.add(namedColors)

const nameToColor = (() => {
  let nameToColor = Object.create(null)
  namedColors.forEach(color => {
    const unidecodedName = unidecode(color.name).toLowerCase()
    nameToColor[unidecodedName] = color
  })
  return nameToColor
})()

const sortedColorNames = Object.keys(nameToColor).sort((a, b) => Math.sign(a.length - b.length))

const colorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

const EXACT = 0
const APPROX = 1
const INVALID = 2

function setUpBot (bot) {
  bot.use(async (ctx, next) => {
    await next()
    console.log(ctx.message)
  })

  bot.catch(err => logError(err))

  bot.start(ctx => ctx.reply(getWelcomeMessage()))

  bot.on('text', ctx => {
    const query = ctx.message.text
    respond(ctx, understandColor(query))
  })

  bot.on('photo', ctx => {
    const thumbnailId = ctx.message.photo[0].file_id
    processIncomingImage(ctx, thumbnailId)
  })

  bot.startPolling()
  return bot
}

function getWelcomeMessage () {
  return `Hi 🖖

Start by sending a...

    color code, like #fff, #ffffff, fff, rgb(...)
    color name, like Berta Blue or Garfield
    or a picture (I will extract the colors)

Source code: https://github.com/qwhex/hexabot/

Have fun!`
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

function findClosestColor (color) {
  const closestColor = colorOctree.closest(color.hex())
  const matchType = closestColor.d === 0 ? EXACT : APPROX
  return [matchType, closestColor.name, closestColor.hex]
}

function searchByName (query) {
  const unidecodedQuery = unidecode(query).toLowerCase()

  if (nameToColor[unidecodedQuery] !== undefined) {
    const match = nameToColor[unidecodedQuery]
    return [EXACT, match.name, match.hex]
  }

  for (const colorName of sortedColorNames) {
    if (colorName.length <= query.length) {
      continue
    }
    if (fuzzysearch(unidecodedQuery, colorName)) {
      const match = nameToColor[colorName]
      return [APPROX, match.name, match.hex]
    }
  }
  return [INVALID, query, '']
}

function processIncomingImage (ctx, thumbnailId) {
  const imgSavePath = path.resolve(__dirname, `./cache/img/${thumbnailId}`)
  ctx.telegram.getFileLink(thumbnailId).then(thumbnailUrl => {
    fetch(thumbnailUrl).then(image => image.body
      .pipe(fs.createWriteStream(imgSavePath))
      .on('close', () => extractColors(ctx, imgSavePath))
    )
  })
}

function extractColors (ctx, imgPath) {
  // Todo use buffer directly
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
    return respondWithImage(ctx, result, `${colorInfo}`)
  case APPROX:
    return respondWithImage(ctx, result, `Closest match:\n\n${colorInfo}`)
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

function respondWithImage (ctx, result, caption) {
  const [colorName, colorHex] = result.slice(1, 3)
  const filename = `${colorHex}.png`
  const imagePath = path.resolve(__dirname, `./cache/${filename}`)

  if (existsInCache(imagePath)) {
    return sendImage(ctx, imagePath, filename, caption)
  }

  svg2png(render.drawImage(colorHex, colorName).svg())
    .then(buffer => {
      sendImage(ctx, buffer, filename, caption)
      pn.writeFile(imagePath, buffer)
        .catch(err => logError(err))
    })
    .catch(err => logError(err))
}

function existsInCache (imagePath, cacheEnabled = CACHE_ENABLED) {
  return cacheEnabled ? fs.existsSync(imagePath) : false
}

function sendImage (ctx, source, filename, caption) {
  const chatId = ctx.message.chat.id
  const messageId = ctx.message.message_id

  return ctx.telegram.sendPhoto(
    chatId,
    {source: source},
    {
      filename: filename,
      caption: caption,
      reply_to_message_id: messageId
    })
    .catch(err => logError(err))
}

function logError (error) {
  console.error(error)
}

if (require.main === module) {
  setUpBot(new Telegraf(TOKEN))
}

exports.EXACT = EXACT
exports.APPROX = APPROX
exports.INVALID = INVALID
exports.hexize = hexize
exports.findClosestColor = findClosestColor
exports.understandColor = understandColor
exports.searchByName = searchByName
exports.getInfoString = getInfoString
exports.existsInCache = existsInCache
