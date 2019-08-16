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
  it ('should run a graphql find query with limit and skip', async () => {
    let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    console.log("RESPONSE", JSON.stringify(ctx.response))
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: [ 
          { "letter": "C" },
          { "letter": "D" }
        ]
      }
    })
  })
  it ('should do a basic sort', async () => {
    let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1, sort: { fields: [ value ], order: [ DESC ] }) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    console.log("RESPONSE", JSON.stringify(ctx.response))
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    console.log("SORT", JSON.stringify(body, null, 2))
    expect(body).toEqual({
      data: {
        find: [ 
          { "letter": "G" },
          { "letter": "F" }
        ]
      }
    })
  })
  it ('should match on an array value', async () => {
    let query = `{ find (filter: { list: { in: [ "foo", "world" ] } }) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    console.log("RESPONSE", JSON.stringify(ctx.response))
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    console.log("SORT", JSON.stringify(body, null, 2))
    expect(body).toEqual({
      data: {
        find: [ 
          { "letter": "A" },
          { "letter": "B" }
        ]
      }
    })
  })
  it ('should run a graphql findOne query for a specific schema', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { letter } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: [ { "letter": "A" } ]
      }
    })
  })
  it ('should serialize date and datetime correctly', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { letter, date, datetime } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: [ {
          "letter": "A",
          "date": "1979-05-16",
          "datetime": "1979-05-16T21:01:23.000Z"
        } ]
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
