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
  it ('should fetch the playground', async () => {
    let ctx = createTestEvent(SPREADSHEETID)
    await func.invoke(ctx)
    console.log("RESPONSE", ctx.response)
    expect(ctx.response.statusCode).toBe(200)
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
    context: { }
  }
}

// new Promise((resolve, reject) => {
//   handler(event, context, (err, value) => {
//     if (err) {
//       return reject(err)
//     } 
//     return resolve(value)
//   })
// })
