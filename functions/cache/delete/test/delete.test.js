require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')
const TOKEN = process.env.AUTH0_TOKEN 
const NONDOMAIN_ID = "1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I" // Supersheets Public View Test (funcmatic.com)

describe('Error Handling', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ('should return Unauthorized if user does not have token', async () => {
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
  it ('should return Unauthorized if user is not a part of the org', async () => {
    let ctx = createCtx()
    ctx.event.pathParameters.spreadsheetid = NONDOMAIN_ID
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ('should return statusCode of 404 Not Found if key has no data', async () => {
    let ctx = createCtx()
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    ctx.state.supersheets = mockaxios({
      statusCode: 200
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Not Found: Key supersheets:sheet:BAD-SPREADSHEET-ID:find does not exist in cache"
    })
  })
})

describe('Func', () => {
  const key = 'supersheets:sheet:MY-SPREADSHEET-ID:find'
  let func = null
  let cache = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    cache = await RedisObjectCache.create(process.env.FUNC_REDIS_URL, { password: process.env.FUNC_REDIS_PASSWORD })
  })
  afterEach(async () => {
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
    if (cache.isConnected()) {
      await cache.del(key)
      await cache.quit()
    }
  })
  it ('should return statusCode of 404 Not Found if key does not exist', async () => {
    let ctx = createCtx()
    ctx.state.supersheets = mockaxios({
      statusCode: 200
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Not Found: Key supersheets:sheet:MY-SPREADSHEET-ID:find does not exist in cache"
    })
  })
  it ('should return 200 and data if key has data', async () => {
    await cache.set(key, { hello: "world" })
    let ctx = createCtx()
    ctx.state.supersheets = mockaxios({
      statusCode: 200
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: "MY-SPREADSHEET-ID",
      key: "supersheets:sheet:MY-SPREADSHEET-ID:find",
      status: 1
    })
  })
})

function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: 'MY-SPREADSHEET-ID'
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
    },
    env: {
      FUNC_REDIS_URL: process.env.FUNC_REDIS_URL,
      FUNC_REDIS_PASSWORD: process.env.FUNC_REDIS_PASSWORD,
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL
    },
    state: { }
  }
}

function mockaxios(response) {
  return {
    get: async () => {
      return response
    }
  }
}