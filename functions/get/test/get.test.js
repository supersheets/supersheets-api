require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')

// Supersheets Public GraphQL Test
const GOOGLESPREADSHEET_ID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"

describe('Error Handling', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should return 401 Unauthorized if there if user is unauthenticated", async () => {
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
  it ("should return 401 Unauthorized if the user belongs to a different org", async () => {
    let ctx = createCtx() 
    ctx.state = { 
      mongodb: mockdb(async () => {
        return { created_by_org: "some-other-org" }
      }) 
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ("should return 404 Not Found if the id is invalid", async () => {
    let ctx = createCtx() 
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Could not find metadata with id BAD-SPREADSHEET-ID` 
    })
  })
  it ("should return 500 Internal Server error if mongodb error", async () => {
    let ctx = createCtx() 
    ctx.state = { 
      mongodb: mockdb(async () => {
        throw new Error("some Mongodb error")
      }) 
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up metadata for ${GOOGLESPREADSHEET_ID}`
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
  it ("should return the metadata for a spreadsheet", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID
    })
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AUTH_TOKEN}`
      },
      stageVariables: {
        // FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
        // staging for now while /dev is still being used in production
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/staging'
      },
      env: {
        JWKS_SKIP_VERIFICATION: 'true'
      }
    }
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