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
  it ('should run a graphql find query for a specific schema', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { 
      edges {
        node {
          letter 
        } 
      }
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ 
            { node:  { "letter": "A" } }
          ],
          totalCount: 1
        }
      }
    })
  }, 30 * 1000)
  it ('should run a graphql find query with limit and skip', async () => {
    let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1) { 
      edges {
        node {
          letter 
        }
      }
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ 
            { node: { "letter": "C" } },
            { node: { "letter": "D" } }
          ],
          totalCount: 2
        }
      }
    })
  })
  it ('should do a basic sort', async () => {
    let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1, sort: { fields: [ value ], order: [ DESC ] }) { 
      edges {
        node {
          letter 
        }
      } 
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ 
            { node: { "letter": "G" } },
            { node: { "letter": "F" } }
          ],
          totalCount: 2
        }
      }
    })
  })
  it ('should match on an array value', async () => {
    let query = `{ find (filter: { list: { in: [ "foo", "world" ] } }) { 
      edges {
        node {
          letter 
        }
      } 
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ 
            { node:  { "letter": "A" } },
            { node:  { "letter": "B" } }
          ],
          totalCount: 2
        }
      }
    })
  })
  it ('should run a graphql findOne query for a specific schema', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { 
      edges {
        node {
          letter 
        }
      } 
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ 
            { node:  { "letter": "A" } }
          ],
          totalCount: 1
        }
      }
    })
  })
  it ('should serialize date and datetime correctly', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { 
      edges {
        node {
          letter 
          date
          datetime
        }
      } 
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
              node: {
                "letter": "A",
                "date": "1979-05-16",
                "datetime": "1979-05-16T21:01:23.000Z"
              } 
          } ],
          totalCount: 1
        } 
      }
    })
  })
  it ('should filter on a nested parameter', async () => {
    let query = `{ find (filter: { googledoc___title: { eq: "Song of Solomon" } } ) { 
      edges {
        node {
          letter
          googledoc { 
            title 
          }
        }
      } 
      totalCount
    } }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ {
            node: {
              "letter": "B",
              "googledoc": {
                "title": "Song of Solomon"
              }
            }
          } ],
          totalCount: 1
        }
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
    context: { },
    env: {
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL
    },
    state: { }
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
