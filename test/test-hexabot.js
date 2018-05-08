/* eslint-env node, mocha */

const expect = require('chai').expect
const hexa = require('../hexabot')
const Color = require('color')
const window = require('svgdom')
const SVG = require('svg.js')(window)
const document = window.document

const exactBlack = [hexa.EXACT, 'Black', '#000000']

describe('Color processing', function () {
  it('RGB to Hex conversion', function () {
    const heiSeBlackHex = hexa.rgbToHex([20, 32, 48])
    const greenHex = hexa.rgbToHex([0, 255, 0])
    const blueHex = hexa.rgbToHex([0, 0, 255])

    expect(heiSeBlackHex).to.equal('#142030')
    expect(greenHex).to.equal('#00ff00')
    expect(blueHex).to.equal('#0000ff')
  }).timeout(10)

  it('Hex matching', function () {
    expect(hexa.hexize('#142030')).to.equal('142030')
    expect(hexa.hexize('142030')).to.equal('142030')
    expect(hexa.hexize('#0f0')).to.equal('0f0')
    expect(hexa.hexize('0f0')).to.equal('0f0')
    expect(hexa.hexize('asdasd')).to.equal('asdasd')
    expect(hexa.hexize('Blind Date')).to.equal('Blind Date')
    expect(hexa.hexize('yellow')).to.equal('yellow')
  }).timeout(10)
})

describe('Color search', function () {
  it('Find exact color', function () {
    expect(hexa.findClosestColor(Color('#0ff'))).to.deep.equal([hexa.EXACT, 'Aqua', '#00ffff'])
  }).timeout(10)

  it('Find closeset color', function () {
    expect(hexa.findClosestColor(Color('#01ffff'))).to.deep.equal([hexa.APPROX, 'Aqua', '#00ffff'])
  }).timeout(10)

  it('Find color by exact name', function () {
    expect(hexa.searchByName('Black')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('black')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(10)

  it('Fuzzy search in color names', function () {
    expect(hexa.searchByName('shrek')).to.deep.equal([hexa.APPROX, 'Shipwreck', '#968772'])
  }).timeout(100)

  it('Understand hexadecimal color strings', function () {
    const exactWhite = [hexa.EXACT, 'White', '#ffffff']
    expect(hexa.understandColor('fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('ffffff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#ffffff')).to.deep.equal(exactWhite)
  }).timeout(10)

  // Todo rgb arrays
  // Todo match multiple

  it('Understand exact color names', function () {
    expect(hexa.understandColor('Black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(10)

  it('Understand approx color names', function () {
    expect(hexa.understandColor('BLAC')).to.deep.equal([hexa.APPROX, 'Black', '#000000'])
  }).timeout(100) // Todo slow
})

describe('Generate colors', function () {
  it('Get background color', function () {
    expect(hexa.getBgColor(Color('#ffffff'))).to.deep.equal(Color('#000000'))
    expect(hexa.getBgColor(Color('#888888'))).to.deep.equal(Color('#000000'))
    // Todo negated return
  }).timeout(10)
})

describe('Image response', function () {
  const fgColorHex = '#ff6666'
  const mainColor = Color(fgColorHex)
  const bgColorHex = '#000000'
  let draw = SVG(document.documentElement).size(850, 700) // Todo constants

  it('Draw color circle', function () {
    const group = hexa.drawColorCircle(draw.group(), fgColorHex, bgColorHex)
    const nodeNames = group.children().map(crate => crate.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'circle'])
  })

  it('Draw rgb bars', function () {
    const group = hexa.drawRgbBars(draw.group(), mainColor)
    const nodeNames = group.children().map(crate => crate.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  })

  it('Draw hsl bars', function () {
    const group = hexa.drawHslBars(draw.group(), mainColor)
    const nodeNames = group.children().map(crate => crate.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  })
})
