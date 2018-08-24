/* eslint-env node, mocha */
'use strict'

const expect = require('chai').expect
const search = require('../src/color-name-search')

const exactBlack = toColorObj([search.EXACT, 'Black', '#000000'])

function toColorObj (colorList) {
  return {
    matchType: colorList[0],
    name: colorList[1],
    hex: colorList[2]
  }
}

describe('Data setup', function () {
  it('should generate a nameToColor hashtable', function () {
    expect(search.createNameToColor([
      {name: 'Red'},
      {name: 'grEEn'},
      {name: 'Blüe'}
    ])).to.deep.equal({
      'red': {name: 'Red'},
      'green': {name: 'grEEn'},
      'blue': {name: 'Blüe'}
    })
  }).timeout(10)

  it('should sort color names by length', function () {
    expect(search.sortByLength(['ccc', 'bb', 'a', 'aaaa']))
      .to.deep.equal(['a', 'bb', 'ccc', 'aaaa'])
  }).timeout(10)
})

describe('Color Processing', function () {
  it('should prefix hex color with #', function () {
    expect(search.hexize('#142030')).to.equal('#142030')
    expect(search.hexize('142030')).to.equal('#142030')
    expect(search.hexize('#0f0')).to.equal('#0f0')
    expect(search.hexize('0f0')).to.equal('#0f0')
    expect(search.hexize('asd')).to.equal('asd')
    expect(search.hexize('asdasd')).to.equal('asdasd')
    expect(search.hexize('Blind Date')).to.equal('Blind Date')
    expect(search.hexize('yellow')).to.equal('yellow')
  }).timeout(20)
})

describe('Color Search', function () {
  it('should find exact color by hex', function () {
    expect(search.findClosest('#0ff')).to.deep.equal(toColorObj([search.EXACT, 'Aqua', '#00ffff']))
  }).timeout(25)

  it('should find closeset color by hex', function () {
    expect(search.findClosest('#01ffff')).to.deep.equal(toColorObj([search.APPROX, 'Aqua', '#00ffff']))
  }).timeout(25)

  it('should find exact color by name', function () {
    expect(search.searchByName('Black').next().value).to.deep.equal(exactBlack)
    expect(search.searchByName('BLACK').next().value).to.deep.equal(exactBlack)
    expect(search.searchByName('black').next().value).to.deep.equal(exactBlack)
    expect(search.searchByName('BlAcK').next().value).to.deep.equal(exactBlack)
  }).timeout(20)

  it('should fuzzy search in color names', function () {
    expect(search.searchByName('shrek').next().value).to.deep.equal(
      {
        'hex': '#968772',
        'matchIndexes': [0, 1, 5, 6, 8],
        'matchType': search.APPROX,
        'name': 'Shipwreck'
      }
    )
  }).timeout(100)

  it('should understand hexadecimal color strings', function () {
    const exactWhite = toColorObj([search.EXACT, 'White', '#ffffff'])
    expect(search.search('fff').next().value).to.deep.equal(exactWhite)
    expect(search.search('#fff').next().value).to.deep.equal(exactWhite)
    expect(search.search('ffffff').next().value).to.deep.equal(exactWhite)
    expect(search.search('#ffffff').next().value).to.deep.equal(exactWhite)
  }).timeout(20)

  // Todo rgb arrays
  // Todo match multiple

  it('should understand exact color names', function () {
    expect(search.search('Black').next().value).to.deep.equal(exactBlack)
    expect(search.search('BLACK').next().value).to.deep.equal(exactBlack)
    expect(search.search('black').next().value).to.deep.equal(exactBlack)
    expect(search.search('BlAcK').next().value).to.deep.equal(exactBlack)
  }).timeout(20)

  it('should understand approx color names', function () {
    expect(search.search('BLAC').next().value).to.deep.equal(
      {
        'hex': '#000000',
        'matchIndexes': [0, 1, 2, 3],
        'matchType': search.APPROX,
        'name': 'Black'
      }
    )
  }).timeout(50)

  it('should identify invalid color names', function () {
    expect(search.search('asdasdasd').next().value).to.equal(undefined)
  }).timeout(75)
})
