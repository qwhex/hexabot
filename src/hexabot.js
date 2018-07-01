'use strict'

const path = require('path')

const fs = require('fs')
const pn = require('pn/fs')
const Color = require('color')
const Telegraf = require('telegraf')
const fetch = require('isomorphic-fetch')
const svg2png = require('svg2png')
const Image = require('canvas').Image
const Colibri = require('colibrijs')
const render = require('./render')
const search = require('./color-name-search')

const DEBUG = false
const TOKEN = process.env.HEXA_KEY

function setUpBot (bot) {
  bot.catch(err => logError(err))
  bot.start(ctx => ctx.reply(getWelcomeMessage()))

  bot.on('text', ctx => {
    sendTypingStatus(ctx)
    const query = ctx.message.text
    const result = search.search(query).next().value
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

function processIncomingImage (ctx, thumbnailId) {
  const imgSavePath = path.resolve(__dirname, `./../cache/img/${thumbnailId}`)
  ctx.telegram.getFileLink(thumbnailId).then(thumbnailUrl => {
    fetch(thumbnailUrl).then(image => image.body
      .pipe(fs.createWriteStream(imgSavePath))
      .on('close', () => {
        for (const contentColor of extractColors(imgSavePath)) {
          respond(ctx, search.understandColor(contentColor))
        }
      })
    )
  })
}

function * extractColors (imgPath) {
  // TODO: use buffer directly
  let img = new Image()
  img.src = fs.readFileSync(imgPath)

  const extractedColors = Colibri.extractImageColors(img, 'css')
  for (const contentColor of extractedColors.content) {
    yield contentColor
  }
}

function respond (ctx, result) {
  const [matchType, colorName, colorHex] = result

  if (matchType === search.INVALID) {
    return ctx.reply(`🤷 ${colorName} 🤷`)
  }

  const colorInfo = getInfoString(colorName, colorHex)

  switch (matchType) {
  case search.EXACT:
    return respondWithImage(ctx, result, `${colorInfo}`)
  case search.APPROX:
    return respondWithImage(ctx, result, `Closest match:\n\n${colorInfo}`)
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
  const imagePath = getCachePathFor(colorHex)

  if (existsInCache(colorHex)) {
    return sendImage(ctx, imagePath, colorHex, caption)
  }

  const svgSource = render.drawImage(colorHex, colorName).svg()

  convertToPng(svgSource, buffer => {
    sendImage(ctx, buffer, colorHex, caption)
    saveInCache(imagePath)
  })
}

function convertToPng (svgSource, callback) {
  svg2png(svgSource)
    .then(callback)
    .catch(err => logError(err))
}

function sendImage (ctx, source, colorHex, caption) {
  const chatId = ctx.message.chat.id
  const messageId = ctx.message.message_id

  return ctx.telegram.sendPhoto(
    chatId,
    {source: source},
    {
      filename: colorHex + '.png',
      caption: caption,
      reply_to_message_id: messageId
    })
    .catch(err => logError(err))
}

function saveInCache (imagePath, buffer) {
  pn.writeFile(imagePath, buffer).catch(err => logError(err))
}

function existsInCache (colorHex) {
  // TODO: cache the cached file list
  return DEBUG ? false : fs.existsSync(getCachePathFor(colorHex))
}

function getCachePathFor (colorHex) {
  return path.resolve(__dirname, `./../cache/${colorHex}.png`)
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
  getInfoString,
  existsInCache,
  getWelcomeMessage,
  extractColors,
  setUpBot
}
