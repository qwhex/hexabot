const Color = require('color')
const window = require('svgdom')
const document = window.document
const SVG = require('svg.js')(window)

function drawImage (fgColorHex, colorName) {
  const mainColor = Color(fgColorHex)
  const bgColor = getBgColor(mainColor)

  let drawing = SVG(document.documentElement).size(850, 700)
  drawColorCircle(drawing.group(), fgColorHex, bgColor.hex())
  drawTitle(drawing.group(), fgColorHex, colorName)
  drawRgbBars(drawing.group(), mainColor)
  drawHslBars(drawing.group(), mainColor)
  return drawing
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

  const barColors = generateRgbBarColors(rgb)

  group.rect(50, heights[0])
    .fill(makeSimpleGradient(group, '#000000', barColors[0]))
    .move(550, 50)
  group.rect(50, heights[1])
    .fill(makeSimpleGradient(group, '#000000', barColors[1]))
    .move(650, 50)
  group.rect(50, heights[2])
    .fill(makeSimpleGradient(group, '#000000', barColors[2]))
    .move(750, 50)

  return group
}

function generateRgbBarColors (rgbArray) {
  return [0, 1, 2].map(rgbPosition => {
    let barColor = [0, 0, 0]
    barColor[rgbPosition] = rgbArray[rgbPosition]
    return Color.rgb(barColor).hex()
  })
}

function drawHslBars (group, mainColor) {
  const height = 275
  const hsl = mainColor.hsl().array()
  const colorHex = mainColor.hex()
  const grayscaleHex = mainColor.desaturate(1).hex()

  group.rect(50, Math.round((hsl[0] / 360) * height))
    .fill(makeSimpleGradient(group, mainColor.negate().hex(), colorHex))
    .move(550, 375)
  group.rect(50, Math.round((hsl[1] / 100) * height))
    .fill(makeSimpleGradient(group, grayscaleHex, colorHex))
    .move(650, 375)
  group.rect(50, Math.round((hsl[2] / 100) * height))
    .fill(makeSimpleGradient(group, '#000000', grayscaleHex))
    .move(750, 375)

  return group
}

function makeSimpleGradient (group, startColorHex, stopColorHex) {
  return group.gradient('linear', stop => {
    stop.at(0, startColorHex)
    stop.at(1, stopColorHex)
  }).from(0, 0).to(0, 1)
}

exports.getBgColor = getBgColor
exports.drawColorCircle = drawColorCircle
exports.drawRgbBars = drawRgbBars
exports.drawHslBars = drawHslBars
exports.drawTitle = drawTitle
exports.drawImage = drawImage
exports.generateRgbBarColors = generateRgbBarColors
