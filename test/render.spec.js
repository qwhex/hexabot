/* eslint-env node, mocha */

const expect = require('chai').expect
const Color = require('color')
const window = require('svgdom')
const document = window.document
const SVG = require('svg.js')(window)
const render = require('../src/render')

describe('Image response', function () {
  const fgColorName = 'Pompelmo'
  const fgColorHex = '#ff6666'
  const mainColor = Color(fgColorHex)
  const bgColorHex = '#000000'
  let draw = SVG(document.documentElement).size(850, 700) // Todo constants

  it('should draw color circle', function () {
    const group = render.drawColorCircle(draw.group(), fgColorHex, bgColorHex)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'circle'])
  }).timeout(20)

  it('should draw rgb bars', function () {
    const group = render.drawRgbBars(draw.group(), mainColor)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  }).timeout(25)

  it('should draw hsl bars', function () {
    const group = render.drawHslBars(draw.group(), mainColor)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['rect', 'rect', 'rect'])
  }).timeout(20)

  it('should draw title', function () {
    const group = render.drawTitle(draw.group(), fgColorHex, fgColorName)
    const nodeNames = group.children().map(item => item.node.nodeName)
    expect(nodeNames).to.deep.equal(['text', 'text'])
  }).timeout(1000)

  it('should draw whole image', function () {
    const drawing = render.drawImage(fgColorHex, fgColorName)
    expect(drawing.attr('version')).to.equal(1.1)
  }).timeout(1000)
})

describe('Generate colors', function () {
  it('should generate high-contrast background colors', function () {
    const fgBgPairs = {
      '#000000': '#ffffff',
      '#c22147': '#ffffff',
      '#ffffff': '#000000',
      '#888888': '#000000',
      '#45dcff': '#000000',
      '#3a243b': '#c5dbc4'
    }
    for (const [key, value] of Object.entries(fgBgPairs)) {
      expect(render.getBgColor(key).hex().toLowerCase()).to.equal(value)
    }
  }).timeout(50)

  it('should generate the end color of rgb bar gradients', function () {
    expect(render.generateRgbBarColors(Color('#c22147').rgb().array())).to.deep.equal(
      ['#C20000', '#002100', '#000047']
    )
  })
})
