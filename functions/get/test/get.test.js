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
  it ("should fetch and update sheet metadata", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    console.log(JSON.stringify(body, null, 2))
    //expect(body).toMatchObject()
  })
})


function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Content-Type': 'application/json'
      },
      stageVariables: {
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    }
  }
}