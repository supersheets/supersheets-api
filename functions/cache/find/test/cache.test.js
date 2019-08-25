require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')

// Goalbook Fist to Five Backend
// const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// Supersheets Public View Test
const GOOGLESPREADSHEET_ID = "1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I"

describe('Valid Access', () => {
  let func = null
  let cache = null
  let key = `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`
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
  it ('should return 200 on a miss and reload the cache', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let cacheresponse = decode64(ctx.response.get('X-Supersheets-Cache-Response'))
    expect(cacheresponse).toMatchObject({
      key: `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`,
      field: 'Mq7LN8bXMqM/NyN08Sl+Zp+N+nE=',
      hit: false,
      t: expect.anything(),
      elapsed: expect.anything()
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query: { "Col1": "v1" },
      one: false,
      count: 2
    })
    expect(body.result[0]).toMatchObject({
      "Col1":"v1"
    })
  }, 30 * 1000)
  it ('should return 200 on a hit and return from the cache', async () => {
    let key = `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`
    let field = 'Mq7LN8bXMqM/NyN08Sl+Zp+N+nE='
    await cache.hset(key, field, { hello: "world" })
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let cacheresponse = decode64(ctx.response.get('X-Supersheets-Cache-Response'))
    expect(cacheresponse).toMatchObject({
      key: `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`,
      field: 'Mq7LN8bXMqM/NyN08Sl+Zp+N+nE=',
      hit: true,
      t: expect.anything(),
      elapsed: expect.anything()
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      hello: "world"
    })
  }, 30 * 1000)
})

function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      body: JSON.stringify({ query: { "Col1": "v1" } }),
      stageVariables: {
        FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
}

function decode64(s) {
  return JSON.parse((new Buffer(s, 'base64')).toString('utf8'))
}