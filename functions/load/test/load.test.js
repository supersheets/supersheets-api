require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

const TOKEN = process.env.AUTH0_TOKEN 

describe('Error Handling', () => {
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
  it ('should return 401 Unauthorized if user is unauthenticated', async () => {
    let ctx = createCtx()
    delete ctx.event.headers['Authorization']
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ('should return 401 Unauthorized if user part of a different org', async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(async () => {
      return { created_by_org: "some-other-org" }
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ('should return 500 Internal Server Error if error finding metadata in mongo', async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(async () => {
      throw new Error("error in find")
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up metadata for ${GOOGLESPREADSHEET_ID}`
    })
  })
  it ('should return 500 Internal Server Error if error fetching a sheet from Google Sheets API', async () => {
    let ctx = createCtx()
    ctx.state.axios = mockaxios(async () => {
      throw new Error("Error fetching from Google Sheets")
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error loading sheet questions: Error fetching from Google Sheets`
    })
  })
})

describe('Function', () => {
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
    let ctx = createCtx()
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


function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Authorization': TOKEN
      }
    },
    env: {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true'
    },
    state: { }
  }
}

function mockdb(callback) {
  return {
    collection: () => {
      return {
        findOne: async () => {
          return await callback()
        }
      }
    }
  }
}

function mockaxios(callback) {
  return {
    get: callback
  }
}