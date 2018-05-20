/* eslint-env node, mocha */

const expect = require('chai').expect
const Color = require('color')
const Telegraf = require('telegraf')
const hexa = require('../hexabot')

const exactBlack = [hexa.EXACT, 'Black', '#000000']

describe('Data setup', function () {
  it('should generate a nameToColor hashtable', function () {
    expect(hexa.getNameToColor([
      {name: 'Red'},
      {name: 'grEEn'},
      {name: 'Blüe'}
    ])).to.deep.equal({
      red: {name: 'Red'},
      green: {name: 'grEEn'},
      blue: {name: 'Blüe'}
    })
  }).timeout(10)

  it('should sort color names by length', function () {
    expect(hexa.sortByLength({'ccc': {}, 'bb': {}, 'a': {}, 'aaaa': {}}))
      .to.deep.equal(['a', 'bb', 'ccc', 'aaaa'])
  }).timeout(10)
})

describe('Color processing', function () {
  it('should prefix hex color with #', function () {
    expect(hexa.hexize('#142030')).to.equal('#142030')
    expect(hexa.hexize('142030')).to.equal('#142030')
    expect(hexa.hexize('#0f0')).to.equal('#0f0')
    expect(hexa.hexize('0f0')).to.equal('#0f0')
    expect(hexa.hexize('asd')).to.equal('asd')
    expect(hexa.hexize('asdasd')).to.equal('asdasd')
    expect(hexa.hexize('Blind Date')).to.equal('Blind Date')
    expect(hexa.hexize('yellow')).to.equal('yellow')
  }).timeout(20)
})

describe('Color search', function () {
  it('should find exact color by hex', function () {
    expect(hexa.findClosestColor(Color('#0ff'))).to.deep.equal([hexa.EXACT, 'Aqua', '#00ffff'])
  }).timeout(25)

  it('should find closeset color by hex', function () {
    expect(hexa.findClosestColor(Color('#01ffff'))).to.deep.equal([hexa.APPROX, 'Aqua', '#00ffff'])
  }).timeout(25)

  it('should find exact color by name', function () {
    expect(hexa.getColorsByName('Black').next().value).to.deep.equal(exactBlack)
    expect(hexa.getColorsByName('BLACK').next().value).to.deep.equal(exactBlack)
    expect(hexa.getColorsByName('black').next().value).to.deep.equal(exactBlack)
    expect(hexa.getColorsByName('BlAcK').next().value).to.deep.equal(exactBlack)
  }).timeout(20)

  it('should fuzzy search in color names', function () {
    expect(hexa.getColorsByName('shrek').next().value).to.deep.equal([hexa.APPROX, 'Shipwreck', '#968772'])
  }).timeout(100)

  it('should understand hexadecimal color strings', function () {
    const exactWhite = [hexa.EXACT, 'White', '#ffffff']
    expect(hexa.understandColor('fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#fff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('ffffff')).to.deep.equal(exactWhite)
    expect(hexa.understandColor('#ffffff')).to.deep.equal(exactWhite)
  }).timeout(20)

  // Todo rgb arrays
  // Todo match multiple

  it('should understand exact color names', function () {
    expect(hexa.understandColor('Black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BLACK')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('black')).to.deep.equal(exactBlack)
    expect(hexa.understandColor('BlAcK')).to.deep.equal(exactBlack)
  }).timeout(20)

  it('should understand approx color names', function () {
    expect(hexa.understandColor('BLAC')).to.deep.equal([hexa.APPROX, 'Black', '#000000'])
  }).timeout(50)

  it('should identify invalid color names', function () {
    expect(hexa.understandColor('asdasdasd')).to.deep.equal([2, 'asdasdasd not found', ''])
  }).timeout(75)
})

describe('Bot response', function () {
  it('should get color info response', function () {
    const color = Color('#000000')
    const infoString = hexa.getInfoString(color)
    const infoLines = infoString.split('\n')
    for (const line of infoLines.slice(1)) {
      expect(Color(line).rgb()).to.deep.equal(color.rgb())
    }
  }).timeout(20)

  it('should get the welcome message', function () {
    expect(hexa.getWelcomeMessage()).to.be.a('string')
  }).timeout(10)
})

describe('Image query', function () {
  it('should extract main colors', function () {
    expect(hexa.extractColors('cache/#45dcff.png').next().value)
      .to.deep.equal('rgb(69,219,254)')
  })
})

describe('I/O', function () {
  it('should check if file exists in cache', function () {
    expect(hexa.existsInCache('cache/#123457.png', false)).to.equal(false)
    expect(hexa.existsInCache('cache/#123457.png', true)).to.equal(false)
    expect(hexa.existsInCache('cache/#45dcff.png', true)).to.equal(true)
    expect(hexa.existsInCache('cache/#45dcff.png')).to.equal(false)
  }).timeout(20)
})

describe('Bot api', function () {
  it('should create the telegraf instance', function () {
    expect(hexa.setUpBot(new Telegraf('TOKEN')).polling.started).to.equal(false)
  })
})
