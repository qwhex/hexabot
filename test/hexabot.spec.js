/* eslint-env node, mocha */

const expect = require('chai').expect
const Color = require('color')
const hexa = require('../hexabot')

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
  }).timeout(20)
})

describe('Color search', function () {
  it('Find exact color', function () {
    expect(hexa.findClosestColor(Color('#0ff'))).to.deep.equal([hexa.EXACT, 'Aqua', '#00ffff'])
  }).timeout(25)

  it('Find closeset color', function () {
    expect(hexa.findClosestColor(Color('#01ffff'))).to.deep.equal([hexa.APPROX, 'Aqua', '#00ffff'])
  }).timeout(25)

  it('Find color by exact name', function () {
    expect(hexa.searchByName('Black')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('black')).to.deep.equal(exactBlack)
    expect(hexa.searchByName('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(20)

  it('Fuzzy search in color names', function () {
    expect(hexa.searchByName('shrek')).to.deep.equal([hexa.APPROX, 'Shipwreck', '#968772'])
  }).timeout(100)

  it('Understand hexadecimal color strings', function () {
    const exactWhite = [hexa.EXACT, 'White', '#ffffff']
    expect(hexa.understandColor('fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('ffffff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#ffffff')).to.deep.equal(exactWhite)
  }).timeout(20)

  // Todo rgb arrays
  // Todo match multiple

  it('Understand exact color names', function () {
    expect(hexa.understandColor('Black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(20)

  it('Understand approx color names', function () {
    expect(hexa.understandColor('BLAC')).to.deep.equal([hexa.APPROX, 'Black', '#000000'])
  }).timeout(100) // Todo slow

  it('Identify invalid color names', function () {
    expect(hexa.understandColor('asdasdasd')).to.deep.equal([hexa.INVALID, 'asdasdasd', ''])
  }).timeout(100)
})

describe('Bot response', function () {
  it('Get color info response', function () {
    const color = Color('#000000')
    const infoString = hexa.getInfoString(color)
    const infoLines = infoString.split('\n')
    for (const line of infoLines.slice(1)) {
      expect(Color(line).rgb()).to.deep.equal(color.rgb())
    }
  }).timeout(10)
})

describe('I/O', function () {
  it('Check if image exists in cache', function () {
    expect(hexa.existsInCache('cache/#123457.png', false)).to.equal(false)
    expect(hexa.existsInCache('cache/#123457.png', true)).to.equal(false)
    expect(hexa.existsInCache('cache/#45dcff.png', true)).to.equal(true)
  }).timeout(20)
})
