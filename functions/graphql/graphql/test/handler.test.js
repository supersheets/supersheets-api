require('dotenv').config()
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
  it ('should run a graphql find query for a specific schema', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    console.log("RESPONSE", JSON.stringify(ctx.response))
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: [ 
          { "letter": "A" }
        ]
      }
    })
  })
  it ('should run a graphql findOne query for a specific schema', async () => {
    let query = `{ findOne (filter: { letter: { eq: "A" } } ) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findOne: { "letter": "A" }
      }
    })
  })
})

function createTestEvent(id, query, variables) {
  variables = variables || null;
  return {
    event: {
      httpMethod: "POST",
      pathParameters: {
        spreadsheetid: id
      },
      body: JSON.stringify({ query, variables })
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
