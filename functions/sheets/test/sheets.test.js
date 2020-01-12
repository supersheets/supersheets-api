require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

describe('Error Handling', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should return 401 Unauthorized if user is unauthenticated", async () => {
    let ctx = createCtx() 
    delete ctx.event.headers['Authorization']
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      "errorMessage": "Unauthorized"
    })
  })
})

describe('Function', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should fetch all sheets in the db for goalbookapp.com users", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    ctx.logger.info(JSON.stringify(ctx.state.auth, null, 2))
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.length).toBe(14)
    expect(body[1]).toMatchObject({
      "id": "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U",
      "title": "Goalbook Fist to Five Backend",
      "updated_at": expect.anything(),
      "nrows": 6
    })
  })
})


function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_TOKEN}`
      },
      stageVariables: {
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    },
    env: {
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      // FUNC_AUTH0_SKIP_VERIFICATION: 'true',
      JWKS_URI: process.env.JWKS_URI,
      // JWKS_SKIP_VERIFICATION: 'true'
    }
  }
}