require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const RedisObjectCache = require('@funcmaticjs/redis-objectcache')

// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const GOOGLESPREADSHEET_ID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"

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
      spreadsheetid: GOOGLESPREADSHEET_ID,
      key: `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`,
      field: 'cyf2lnm1UcwxQb3m2m/c38Y0Zl0=',
      hit: false,
      t: expect.anything(),
      elapsed: expect.anything()
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      data: {
        find: {
          edges: [
            { node: { "letter": "B" } }
          ],
          totalCount: 1
        }
      }
    })
  }, 30 * 1000)
  it ('should return 200 on a hit and return from the cache', async () => {
    let key = `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`
    let field = 'cyf2lnm1UcwxQb3m2m/c38Y0Zl0='
    await cache.hset(key, field, { hello: "world" })
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let cacheresponse = decode64(ctx.response.get('X-Supersheets-Cache-Response'))
    expect(cacheresponse).toMatchObject({
      spreadsheetid: GOOGLESPREADSHEET_ID,
      key: `supersheets:sheet:${GOOGLESPREADSHEET_ID}:find`,
      field: 'cyf2lnm1UcwxQb3m2m/c38Y0Zl0=',
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
  let query = `{
    find (filter: { letter: { eq: "B" } }) { 
      edges {
        node {
          letter 
        } 
      }
      totalCount
    }
  }`
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      body: JSON.stringify({ operationName: null, query }),
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