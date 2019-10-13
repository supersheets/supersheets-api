require('dotenv').config()
const fs = require('fs')
const path = require('path')
const LOGEVENT_SUPERSHEETS = 'logevent.supersheets.json'

const { transform } = require('../lib/transform')

describe('transform', () => {
  it ('should transform', async () => {
    let logEvent = getTestEvent(LOGEVENT_SUPERSHEETS)
    let res = transform(logEvent)
    console.log(res)
  })
})

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'events', name)).toString('utf8'))
}