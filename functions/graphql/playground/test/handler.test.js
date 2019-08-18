require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"
const prettify = require('@funcmaticjs/pretty-logs')

describe('Handler', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ('should fetch the playground with defaults', async () => {
    let ctx = createTestEvent(SPREADSHEETID)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = ctx.response.body
    expect(body).toEqual(expect.stringContaining(`"name": "find"`))
    expect(body).toEqual(expect.stringContaining(`"editor.theme": "dark"`))
  })
  it ('should fetch the playground with custom tabs', async () => {
    let ctx = createTestEvent(SPREADSHEETID)
    ctx.event.queryStringParameters.tabs = stringifyAndEncode([{
      name: "blah",
      endpoint: 'https://hello.world',
      query: '# blah blah'
    }])
    console.log(`tabs=${ctx.event.queryStringParameters.tabs}`)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = ctx.response.body
    expect(body).toEqual(expect.stringContaining(`"name": "blah"`))
  })
  it ('should fetch the playground with custom settings', async () => {
    let ctx = createTestEvent(SPREADSHEETID)
    ctx.event.queryStringParameters.settings = stringifyAndEncode({
      "editor.theme": "light" 
    })
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = ctx.response.body
    expect(body).toEqual(expect.stringContaining(`"editor.theme": "light"`))
  })
})

function createTestEvent(id) {
  return {
    event: {
      httpMethod: "GET",
      pathParameters: {
        spreadsheetid: id
      },
      queryStringParameters: { }
    },
    context: { },
    env: {
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL
    }
  }
}

function stringifyAndEncode(obj) {
  let data = JSON.stringify(obj)
  return (new Buffer(data)).toString('base64')
}

// new Promise((resolve, reject) => {
//   handler(event, context, (err, value) => {
//     if (err) {
//       return reject(err)
//     } 
//     return resolve(value)
//   })
// })


// Light theme Base64 
// {
//   "editor.theme": "light"
// }
// settings=eyJlZGl0b3IudGhlbWUiOiJsaWdodCJ9

// Tabs
// [ {
//   "name": "blah",
//   "endpoint": "https://hello.world",
//   "query": "# blah blah"
// } ]
// tabs=W3sibmFtZSI6ImJsYWgiLCJlbmRwb2ludCI6Imh0dHBzOi8vaGVsbG8ud29ybGQiLCJxdWVyeSI6IiMgYmxhaCBibGFoIn1d