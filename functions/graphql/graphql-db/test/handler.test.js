require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"
const fs = require('fs')
const path = require('path')
const { gql } = require('apollo-server-lambda')
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { findMetadata } = require('../lib/handler')
const NOOP = async () => { }
const SCHEMA_TEST_FILE = 'typedefs_dateformat.gql'

let plugin = new MongoDBPlugin()
let client = null
let db = null
beforeAll(async () => {
  client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
  db = client.db()
  await createTestMetadata(db)
})
afterAll(async () => {
  if (db) {
    await deleteTestMetadata(db)
  }
  if (client) {
    await client.close()
  }
  client = null
  db = null
})


describe('findMetadata', () => {
  let ctx = null
  beforeEach(async () => {
    ctx = {
      event: { pathParameters: { spreadsheetid: SPREADSHEETID } },
      state: { mongodb: db },
      logger: new LoggerWrapper({ prettify })
    }
  })
  afterEach(async () => {
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

describe('findOne', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
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
})

describe('find', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
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
  it("should filter using regex", async () => {
    let query = `{ 
      find (filter: { googledoc___title: { regex: "^Song", options: "i" } }) { 
        edges {
          node {
            googledoc {
              title
            }
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              googledoc: {
                title: "Song of Solomon"
              }
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
    it ('should match on an in (array) query', async () => {
    let query =  `{ 
      find (filter: { letter: { in: [ "C", "D" ] } }) { 
        edges {
          node {
            letter
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ {
            node: {
              "letter": "C"
            },
          }, {
            node: {
              "letter": "D"
            }
          } ]
        }
      }
    })
  })
  it("should sort, limit, and skip", async () => {
    let query = `{ 
      find (sort: { fields: [ letter ], order: [ DESC ] }, limit: 2, skip: 1) { 
        edges {
          node {
            letter
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ {
            node: { 
              letter: "D"
            }
          }, { 
            node: {
              letter: "C"
            }
          } ]
        }
      }
    })
  }, 30 * 1000)
})


describe('date and datetime', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  }, 30 * 1000)
  afterEach(async () => {
    // await func.invokeTeardown()
  }, 30 * 1000)
  it("should serialize date and datetime correctly", async () => {
    let query = `{ 
      find (filter: { letter: { eq: "A" } }) { 
        edges {
          node {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z" 
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it("should filter query date and datetime", async () => {
    let query = `{ 
      find (filter: { date: { gt: "1979-05-15" }, datetime: { lte: "1979-05-16T21:01:23.000Z" } }) { 
        edges {
          node {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z" 
            } 
          } ]
        }
      }
    })
    // Time just barely missing by a second
    query = `{ 
      find (filter: { date: { gt: "1979-05-15" }, datetime: { lte: "1979-05-16T21:01:22.000Z" } }) { 
        edges {
          node {
            letter
            date
            datetime 
          }
        } 
      }
    }`
    ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ ]
        }
      }
    })
  }, 30 * 1000)
  it("should take date and datetime formatting arguments", async () => {
    let query = `{ 
      find (filter: { letter: { eq: "A" } }) { 
        edges {
          node {
            letter
            date(formatString: "DDDD")
            datetime(formatString: "DDDD ttt")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "A",
              date: "Wednesday, May 16, 1979",
              datetime: "Wednesday, May 16, 1979 9:01:23 PM UTC" 
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should not throw if date and datime are null", async () => {
    let query = `{ 
      find (filter: { letter: { eq: "E" } }) { 
        edges {
          node {
            letter
            date(formatString: "DDDD")
            datetime(formatString: "DDDD ttt")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "E",
              date: null,
              datetime: null
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should accept timezone", async () => {
    let query = `{ 
      find (filter: { letter: { eq: "A" } }) { 
        edges {
          node {
            letter
            date(formatString: "DDDD ttt", zone: "America/Los_Angeles")
            datetime(formatString: "DDDD ttt", zone: "America/Los_Angeles")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "A",
              date: "Wednesday, May 16, 1979 12:00:00 AM PDT",
              datetime: "Wednesday, May 16, 1979 2:01:23 PM PDT"
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
  it ("should noop on locale (to be supported later)", async () => {
    let query = `{ 
      find (filter: { letter: { eq: "A" } }) { 
        edges {
          node {
            letter
            date(locale: "fr")
            datetime(locale: "fr")
          }
        } 
      }
    }`
    let ctx = createTestEvent(SPREADSHEETID, query)
    await func.invoke(ctx)
    expect(ctx.response.statusCode).toBe(200)
    let body = JSON.parse(ctx.response.body)
    expect(body).toEqual({
      data: {
        find: {
          edges: [ { 
            node: { 
              letter: "A",
              date: "1979-05-16",
              datetime: "1979-05-16T21:01:23.000Z"
            } 
          } ]
        }
      }
    })
  }, 30 * 1000)
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
      SUPERSHEETS_BASE_URL: process.env.SUPERSHEETS_BASE_URL,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    },
    state: { 
      mongodb: db,
      typeDefs: gql(fs.readFileSync(path.join(__dirname, SCHEMA_TEST_FILE)).toString('utf8'))
    },
    logger: new LoggerWrapper({ prettify })
  }
}

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
    { letter: "A", value: 65, date: new Date("1979-05-16"), datetime: new Date("1979-05-16T21:01:23.000Z"), googledoc: { title: "The Gettysburg Address" } },
    { letter: "B", value: 65, date: new Date("2019-07-04"), datetime: new Date("2019-07-04T03:21:00.000Z"), googledoc: { title: "Song of Solomon" } },
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