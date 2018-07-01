/* eslint-env node, mocha */

const expect = require('chai').expect
const Color = require('color')
const Telegraf = require('telegraf')
const hexa = require('../src/hexabot')

describe('Bot Response', function () {
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

describe('Image Query', function () {
  it('should extract main colors', function () {
    expect(hexa.extractColors('cache/#45dcff.png').next().value)
      .to.deep.equal('rgb(69,219,254)')
  })
})

describe('I/O', function () {
  it('should check if file exists in cache', function () {
    // expect(hexa.existsInCache('anything')).to.equal(false)
    expect(hexa.existsInCache('notfound')).to.equal(false)
    expect(hexa.existsInCache('#123456')).to.equal(true)
  }).timeout(20)
})

describe('Bot api', function () {
  it('should create the telegraf instance', function () {
    expect(hexa.setUpBot(new Telegraf('TOKEN')).polling.started).to.equal(false)
  })
})
