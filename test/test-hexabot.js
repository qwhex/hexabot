/* eslint-env node, mocha */

const expect = require('chai').expect
const hexa = require('../hexabot')
const Color = require('color')

describe('Color processing', function () {
  it('RGB to Hex conversion', function () {
    const heiSeBlackHex = hexa.colorToHex([20, 32, 48])
    const greenHex = hexa.colorToHex([0, 255, 0])
    const blueHex = hexa.colorToHex([0, 0, 255])

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
    expect(hexa.hexize('asdasdasd')).to.equal('asdasdasd')
    expect(hexa.hexize('yellow')).to.equal('yellow')
  }).timeout(10)
})

describe('Color search', function () {
  it('Find closeset color', function () {
    expect(hexa.findClosestColor(Color('#0ff'))).to.deep.equal([hexa.EXACT, 'Aqua', '#00ffff'])
    expect(hexa.findClosestColor(Color('#01ffff'))).to.deep.equal([hexa.APPROX, 'Aqua', '#00ffff'])
  }).timeout(10)

  it('Understand hexadecimal color strings', function () {
    const exactWhite = [hexa.EXACT, 'White', '#ffffff']
    expect(hexa.understandColor('fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('ffffff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#ffffff')).to.deep.equal(exactWhite)
  }).timeout(10)

  it('Understand exact color names', function () {
    const exactBlack = [hexa.EXACT, 'Black', '#000000']
    expect(hexa.understandColor('Black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(10)

  it('Understand approx color names', function () {
    expect(hexa.understandColor('BLAC')).to.deep.equal([hexa.APPROX, 'Accursed Black', '#090807']) // Todo
    expect(hexa.understandColor('ok')).to.deep.equal([hexa.APPROX, 'Amazing Smoke', '#6680bb'])
  }).timeout(100) // Todo slow
})

describe('Generate colors', function () {
  it('Get background color', function () {
    expect(hexa.getBgColor(Color('#ffffff'))).to.deep.equal(Color('#000000'))
    expect(hexa.getBgColor(Color('#888888'))).to.deep.equal(Color('#000000'))
  })
})
