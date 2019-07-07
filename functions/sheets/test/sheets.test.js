require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

describe('Function', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should fetch all sheets in the db (for now)", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    // console.log(JSON.stringify(body, null, 2))
    expect(body.length).toBe(15)
    expect(body[1]).toMatchObject({
      "_id": "5d1adabce62b51923ec06260",
      "id": "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U",
      "title": "Goalbook Fist to Five Backend",
      "updated_at": "2019-07-02T04:35:04.413Z",
      "uuid": "a4938a00-2573-4173-9c24-c3f1c81c18b2",
      "nrows": 6
    })
  })
})


function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      stageVariables: {
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    }
  }
}