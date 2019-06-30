require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// Present Levels Statement Data
// const GOOGLESPREADSHEET_ID = "1DWu7BBWo1jq-u0ZIXvrMtgGvNvieP7-MznVAf_GQlBo"

describe('Response Format', () => {
  let func = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should return statusCode of 200 OK', async () => {
    let ctx = { 
      event: {
        pathParameters: {
          spreadsheetid: GOOGLESPREADSHEET_ID
        },
        body: JSON.stringify({query: { "question_id": "Q1" } }),
        stageVariables: {
          FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
        }
      }
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query: { query: { "question_id": "Q1" } }
    })
  }, 60 * 1000)
})