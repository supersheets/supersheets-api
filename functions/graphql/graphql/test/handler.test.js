require('dotenv').config()
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"

describe('Handler', () => {
  let handler = null
  beforeEach(async () => {
    handler = require('../index').handler
  })
  it ('should run a graphql query for a specific schema', async () => {
    let query = `{ find (filter: { letter: { eq: "A" } } ) { letter } }`
    let { event, context } = createTestEvent(SPREADSHEETID, query)
    let response = await handler(event, context)
    expect(response.statusCode).toBe(200)
    let body = JSON.parse(response.body)
    expect(body).toEqual({
      data: {
        find: [ 
          { "letter": "A" }
        ]
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
