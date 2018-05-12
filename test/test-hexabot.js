/* eslint-env node, mocha */

const expect = require('chai').expect
const hexa = require('../hexabot')
const Color = require('color')
const window = require('svgdom')
const SVG = require('svg.js')(window)
const document = window.document

const exactBlack = [hexa.EXACT, 'Black', '#000000']

describe('Color processing', function () {
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

  it('Identify invalid color names', function () {
    expect(hexa.understandColor('asdasdasd')).to.deep.equal([hexa.INVALID, 'asdasdasd', ''])
  }).timeout(100)
})

describe('Generate colors', function () {
  it('Get background color', function () {
    expect(hexa.getBgColor(Color('#ffffff'))).to.deep.equal(Color('#000000'))
    expect(hexa.getBgColor(Color('#888888'))).to.deep.equal(Color('#000000'))
    expect(hexa.getBgColor(Color('#45dcff'))).to.deep.equal(Color('#000000'))
    expect(hexa.getBgColor(Color('#c22147'))).to.deep.equal(Color('#ffffff'))
    expect(hexa.getBgColor(Color('#3a243b'))).to.deep.equal(Color('#c5dbc4'))
  }).timeout(10)
})

describe('Image response', function () {
  const fgColorName = 'Pompelmo'
  const fgColorHex = '#ff6666'
  const mainColor = Color(fgColorHex)
  const bgColorHex = '#000000'
  let draw = SVG(document.documentElement).size(850, 700) // Todo constants

  it('Draw color circle', function () {
    const group = hexa.drawColorCircle(draw.group(), fgColorHex, bgColorHex)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'circle'])
  })

  it('Draw rgb bars', function () {
    const group = hexa.drawRgbBars(draw.group(), mainColor)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  })

  it('Draw hsl bars', function () {
    const group = hexa.drawHslBars(draw.group(), mainColor)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  })

  it('Draw title', function () {
    const group = hexa.drawTitle(draw.group(), fgColorHex, fgColorName)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['text', 'text'])
  })

  it('Draw whole image', function () {
    const drawing = hexa.drawImage(fgColorHex, fgColorName)
    expect(drawing.attr('version')).to.equal(1.1)
    // Expect('foobar').to.include('foo');
  })
})

describe('Bot response', function () {
  it('Get color info response', function () {
    const color = Color('#000000')
    const infoString = hexa.getInfoString(color)
    const infoLines = infoString.split('\n')
    for (const line of infoLines.slice(1)) {
      expect(Color(line).rgb()).to.deep.equal(color.rgb())
    }
  })
})
