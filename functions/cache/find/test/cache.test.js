require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

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
      key: 'supersheets:sheet:1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U:find',
      field: 'ecMKTmMGd5Z8RUvuOFD5e+XFl9U=',
      hit: false,
      t: expect.anything(),
      elapsed: expect.anything()
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query: { "question_id": "Q1" },
      one: false,
      count: 4
    })
    expect(body.result[0]).toMatchObject({
      "question_id":"Q1"
    })
  })
  it ('should return 200 on a hit and return from the cache', async () => {
    let key = 'supersheets:sheet:1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U:find'
    let field = 'ecMKTmMGd5Z8RUvuOFD5e+XFl9U='
    await cache.hset(key, field, { hello: "world" })
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let cacheresponse = decode64(ctx.response.get('X-Supersheets-Cache-Response'))
    expect(cacheresponse).toMatchObject({
      key: 'supersheets:sheet:1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U:find',
      field: 'ecMKTmMGd5Z8RUvuOFD5e+XFl9U=',
      hit: true,
      t: expect.anything(),
      elapsed: expect.anything()
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      hello: "world"
    })
  })
})

function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      body: JSON.stringify({ query: { "question_id": "Q1" } }),
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