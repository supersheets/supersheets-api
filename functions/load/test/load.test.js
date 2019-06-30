require('dotenv').config()

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
        }
      },
      env: {
        GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
        GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
        FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
      }
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7,
      ncells: 22
    })
  }, 60 * 1000)
})