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
  it ("should find multiple results", async () => {
    let ctx = createCtx({ query: { "question_id": "Q1" } }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query:  { 
        question_id: "Q1" 
      } 
    })
    expect(body.count).toBe(4)
    expect(body.result.length).toBe(4)
    expect(body.result[0]).toMatchObject({
      question_id: "Q1"
    })
  })
  it ("should not find multiple results", async () => {
    let ctx = createCtx({ query: { "question_id": "NOID" } }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.count).toBe(0)
    expect(body.result).toEqual([])
  })
  it ("should find one result", async () => {
    let ctx = createCtx({ 
      query: { 
        "question_id": "Q1" 
      },
      one: true 
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body) 
    expect(body.count).toBe(1)
    expect(body.result).toMatchObject({
      question_id: "Q1"
    })
  })
  it ("should not find one result", async () => {
    let ctx = createCtx({ 
      query: { 
        "question_id": "NOID" 
      },
      one: true 
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.count).toBe(0)
    expect(body.result).toEqual(null)
  })
})


function createCtx(body) {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      stageVariables: {
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    }
  }
}