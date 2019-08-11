require('dotenv').config()
const { generate, generateDoc } = require('../lib/schema') 
const { gql } = require('apollo-server-lambda')

let metadata = {
  schema: {
    columns: [
      {"name":"letter","datatype":"String","sample":"A","sheets":["data"]},
      {"name":"value","datatype":"Number","sample":65,"sheets":["data"]}
    ]
  }
}

describe('Generate', () => {
  it ('should print schema', async () => {
    let sdl = generate(metadata, { name: "Letter" })
    console.log(sdl)
    let parsed = gql`${sdl}`
    console.log(parsed)
  })
})

// describe('Function', () => { 
//   let func = null
//   beforeEach(async () => {
//     func = require('../index.js').func
//     func.logger.logger.prettify = prettify
//   })
//   afterEach(async () => {
//     await func.invokeTeardown()
//   })
//   it ("should return the metadata for a spreadsheet", async () => {
//     let ctx = createCtx() 
//     await func.invoke(ctx)
//     expect(ctx.response).toMatchObject({
//       statusCode: 200
//     })
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toMatchObject({
//       id: GOOGLESPREADSHEET_ID
//     })
//   })
// })

function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: SPREADSHEETID
      },
      headers: {
        'Content-Type': 'application/json',
      },
    },
    env: {
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    }
  }
}

function mockdb(callback) {
  return {
    collection: () => {
      return {
        findOne: async () => {
          return await callback()
        }
      }
    }
  }
}