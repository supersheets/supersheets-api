require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')

describe('Regular Get', () => {
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
  it ('should return statusCode of 404 Not Found if key has no data', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Not Found: Key supersheets:sheet:MY-SPREADSHEET-ID:find does not exist in cache"
    })
  })
  it ('should return 200 and info about the redis hash', async () => {
    await cache.hset(key, "field", { hello: "world" })
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      key,
      ttl: -1,
      n: 1
    })
  })
  it ('should return values of the redis hash', async () => {
    await cache.hset(key, "field", { hello: "world" })
    let ctx = createCtx()
    ctx.event.queryStringParameters.values = 'true'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      key,
      ttl: -1,
      n: 1,
      values: {
        "field": { hello: "world" }
      }
    })
  })
})

function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: 'MY-SPREADSHEET-ID'
      },
      queryStringParameters: { },
      stageVariables: {
        FUNC_REDIS_URL: process.env.FUNC_REDIS_URL,
        FUNC_REDIS_PASSWORD: process.env.FUNC_REDIS_PASSWORD
      }
    }
  }
}