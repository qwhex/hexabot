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

const colorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

// Response types
const EXACT = 0
const APPROX = 1
const INVALID = 2

const nameToColor = getNameToColor(namedColors)
const sortedColorNames = sortByLength(nameToColor)

function getNameToColor (namedColors) {
  let nameToColor = Object.create(null)
  namedColors.forEach(color => {
    nameToColor[slugify(color.name)] = color
  })
  return nameToColor
}

function sortByLength (nameToColor) {
  return Object.keys(nameToColor).sort((a, b) => Math.sign(a.length - b.length))
}

function setUpBot (bot) {
  bot.catch(err => logError(err))
  bot.start(ctx => ctx.reply(getWelcomeMessage()))

  bot.on('text', ctx => {
    sendTypingStatus(ctx)
    const query = ctx.message.text
    const result = understandColor(query)
    respond(ctx, result)
  })

  bot.on('photo', ctx => {
    sendTypingStatus(ctx)
    const thumbnailId = ctx.message.photo[0].file_id
    processIncomingImage(ctx, thumbnailId)
  })

  return bot
}

function sendTypingStatus (ctx) {
  ctx.telegram.sendChatAction(ctx.message.chat.id, 'typing')
}

function getWelcomeMessage () {
  return `Hi 🖖

Start by sending a...

    color code, like #fff, #ffffff, fff, rgb(...)
    color name, like Berta Blue, Void or Garfield
    or a picture (I will extract the colors)

Source code: https://github.com/qwhex/hexabot/

Have fun!`
}

function understandColor (colorString) {
  try {
    return findClosestColor(Color(hexize(colorString)))
  } catch (exception) {
    const results = getColorsByName(colorString)
    return results.next().value
  }
}

function hexize (possibleHex) {
  const matches = possibleHex.match(colorRegex)
  return matches !== null ? '#' + matches[1] : possibleHex
}

function findClosestColor (color) {
  const closestColor = colorOctree.closest(color.hex())
  const matchType = closestColor.d === 0 ? EXACT : APPROX
  return [matchType, closestColor.name, closestColor.hex]
}

function * getColorsByName (query) {
  const slugQuery = slugify(query)

  try {
    return findExactColorName(slugQuery)
  } catch (exception) {
    yield * fuzzyColorNames(slugQuery)
  }

  return [INVALID, `${slugQuery} not found`, '']
}

function slugify (string) {
  return unidecode(string).toLowerCase()
}

function findExactColorName (colorNameQuery) {
  if (nameToColor[colorNameQuery] !== undefined) {
    const match = nameToColor[colorNameQuery]
    return [EXACT, match.name, match.hex]
  }
  throw new Error(`${colorNameQuery} not found`)
}

function * fuzzyColorNames (colorNameQuery) {
  for (const colorName of sortedColorNames) {
    if (colorName.length <= colorNameQuery.length) {
      continue
    }
    if (fuzzysearch(colorNameQuery, colorName)) {
      const match = nameToColor[colorName]
      yield [APPROX, match.name, match.hex]
    }
  }
}

function processIncomingImage (ctx, thumbnailId) {
  const imgSavePath = path.resolve(__dirname, `./cache/img/${thumbnailId}`)
  ctx.telegram.getFileLink(thumbnailId).then(thumbnailUrl => {
    fetch(thumbnailUrl).then(image => image.body
      .pipe(fs.createWriteStream(imgSavePath))
      .on('close', () => {
        for (const contentColor of extractColors(imgSavePath)) {
          respond(ctx, findClosestColor(Color(contentColor)))
        }
      })
    )
  })
}

function * extractColors (imgPath) {
  // Todo use buffer directly
  let img = new Image()
  img.src = fs.readFileSync(imgPath)

  const extractedColors = Colibri.extractImageColors(img, 'css')
  for (const contentColor of extractedColors.content) {
    yield contentColor
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
  }
  ctx.reply(`🤷 ${colorName} 🤷`)
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

function main () {
  let bot = setUpBot(new Telegraf(TOKEN))
  bot.startPolling()
}

if (require.main === module) {
  main()
}

module.exports = {
  EXACT,
  APPROX,
  INVALID,
  hexize,
  findClosestColor,
  understandColor,
  getColorsByName,
  getInfoString,
  existsInCache,
  getNameToColor,
  sortByLength,
  getWelcomeMessage,
  extractColors,
  setUpBot
}
