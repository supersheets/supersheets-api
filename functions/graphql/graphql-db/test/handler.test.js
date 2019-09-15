require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { findMetadata } = require('../lib/handler')
const NOOP = async () => { }

describe('findMetadata', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let ctx = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    client = null
    db = null
  })
  beforeEach(async () => {
    ctx = {
      event: { pathParameters: { spreadsheetid: SPREADSHEETID } },
      state: { mongodb: db },
      logger: new LoggerWrapper({ prettify })
    }
    await createTestMetadata(db)
  })
  afterEach(async () => {
    await deleteTestMetadata(db)
  })
  it ('should throw if id is invalid', async () => {
    let error = null
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    try {
      await findMetadata(ctx, NOOP) 
    } catch (err) {
      error = err
    }
    expect(ctx.state.metadata).toBeFalsy()
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Not Found: Supersheet with id ${ctx.event.pathParameters.spreadsheetid} could not be found`)
  }, 30 * 1000)
  it ('should set ctx.state.metadata', async () => {
    ctx.event.pathParameters.spreadsheetid = SPREADSHEETID
    await findMetadata(ctx, NOOP) 
    expect(ctx.state.metadata).toMatchObject({
      id: SPREADSHEETID,
      datauuid: 'DATAUUID'
    })
  }, 30 * 1000)
})


describe('Handler', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    client = null
    db = null
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    await createTestMetadata(db)
  }, 30 * 1000)
  afterEach(async () => {
    await func.invokeTeardown()
    await deleteTestMetadata(db)
  }, 30 * 1000)
  it ('should run a basic findOne query', async () => {
    let query = `{ 
      findOne { 
        letter
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findOne: {
          "letter": "A"
        }
      }
    })
  }, 30 * 1000)
  it ('should run a findOne query with filter', async () => {
    let query = `{ 
      findOne (filter: { letter: { eq: "B" } } ) { 
        letter
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        findOne: {
          "letter": "B"
        }
      }
    })
  }, 30 * 1000)
  it ('should run a basic find all query', async () => {
    let query = `{ 
      find { 
        edges {
          node {
            letter 
          } 
        }
        totalCount
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          totalCount: 5,
          edges: [
            { node: { "letter": "A" } },
            { node: { "letter": "B" } },
            { node: { "letter": "C" } },
            { node: { "letter": "D" } },
            { node: { "letter": "E" } }
          ]
        }
      }
    })
  }, 30 * 1000)
  it ('should run a find all with filter', async () => {
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
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          totalCount: 1,
          edges: [
            { node: { "letter": "B" } }
          ]
        }
      }
    })
  }, 30 * 1000)
})

//   it ('should run a graphql find query with limit and skip', async () => {
//     let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1) { letter } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ 
//           { "letter": "C" },
//           { "letter": "D" }
//         ]
//       }
//     })
//   })
//   it ('should do a basic sort', async () => {
//     let query = `{ find (filter: { value: { gt: 65, lt: 73 } }, limit: 2, skip: 1, sort: { fields: [ value ], order: [ DESC ] }) { letter } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ 
//           { "letter": "G" },
//           { "letter": "F" }
//         ]
//       }
//     })
//   })
//   it ('should match on an array value', async () => {
//     let query = `{ find (filter: { list: { in: [ "foo", "world" ] } }) { letter } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ 
//           { "letter": "A" },
//           { "letter": "B" }
//         ]
//       }
//     })
//   })
//   it ('should run a graphql findOne query for a specific schema', async () => {
//     let query = `{ find (filter: { letter: { eq: "A" } } ) { letter } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ { "letter": "A" } ]
//       }
//     })
//   })
//   it ('should serialize date and datetime correctly', async () => {
//     let query = `{ find (filter: { letter: { eq: "A" } } ) { letter, date, datetime } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ {
//           "letter": "A",
//           "date": "1979-05-16",
//           "datetime": "1979-05-16T21:01:23.000Z"
//         } ]
//       }
//     })
//   })
//   it ('should filter on a nested parameter', async () => {
//     let query = `{ find (filter: { googledoc___title: { eq: "Song of Solomon" } } ) { letter, googledoc { title } } }`
//     let ctx = createTestEvent(SPREADSHEETID, query)
//     await func.invoke(ctx)
//     expect(ctx.response.statusCode).toBe(200)
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toEqual({
//       data: {
//         find: [ {
//           "letter": "B",
//           "googledoc": {
//             "title": "Song of Solomon"
//           }
//         } ]
//       }
//     })
//   })
// })

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
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    },
    state: { },
    logger: new LoggerWrapper({ prettify })
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


async function createTestMetadata(db, options) {
  options = options || { }
  let id = options.id || SPREADSHEETID
  let datauuid = options.datauuid || 'DATAUUID'
  await db.collection('spreadsheets').updateOne({ id }, { "$set": { id, datauuid } }, { upsert: true })
  await createTestData(db, { datauuid })
  return { id, datauuid }
}

async function createTestData(db, options) {
  let data = [ 
    { letter: "A", value: 65 },
    { letter: "B", value: 65 },
    { letter: "C", value: 66 },
    { letter: "D", value: 67 },
    { letter: "E", value: 68 }
  ]
  let datauuid = options.datauuid || 'DATAUUID'
  await db.collection(datauuid).insertMany(data)
  return
}

async function deleteTestMetadata(db, options) {
  options = options || { }
  let id = options.id || SPREADSHEETID
  let datauuid = options.datauuid || 'DATAUUID'
  try { 
    await db.collection('spreadsheets').deleteOne({ id })
    await db.collection(datauuid).drop()
  } catch (err) {

  }
  return 
}