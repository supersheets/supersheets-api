require('dotenv').config()
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')
const TESTID = "TEST-SPREADSHEET-ID"
const TOKEN = process.env.AUTH0_TOKEN 

describe('Error Handling', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await createTestData(db)
  })
  afterEach(async () => {
    await client.close()
    await func.invokeTeardown()
  })
  it ("Should 401 Unauthorized if user is unauthenticated", async () => {
    let ctx = createCtx() 
    delete ctx.event.headers['Authorization']
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Unauthorized`
    })
  })
  it ("Should return 401 Unauthorized if the user is trying to delete for another org", async () => {
    let ctx = createCtx() 
    ctx.state.mongodb = mockdb(async () => {
      return {
        created_by_org: "someother.org"
      }
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Unauthorized`
    })
  })
  it ("should return 404 Not Found for bad id", async () => {
    let ctx = createCtx() 
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Could not find metadata with id BAD-SPREADSHEET-ID`
    })
  })
  it ("should return 404 Not Found for bad id", async () => {
    let ctx = createCtx() 
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Could not find metadata with id BAD-SPREADSHEET-ID`
    })
  })
  it ("Should return 500 if mongo error in find", async () => {
    let ctx = createCtx() 
    ctx.state.mongodb = mockdb(async () => {
      throw new Error("Mongodb error in find")
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up metadata for ${TESTID}`
    })
  })
  it ("Should return 500 if mongo error in delete", async () => {
    let ctx = createCtx() 
    ctx.state.mongodb = mockdb(async () => {
      return { id: TESTID }
    }, async () => {
      throw new Error("Error in delete")
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Failed to delete Supersheet ${TESTID}`
    })
  })
})

describe('Function', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await createTestData(db)
  })
  afterEach(async () => {
    await client.close()
    await func.invokeTeardown()
  })
  it ("should delete sheet metadata and data", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      ok: 1,
      n: 1
    })
  })
})

async function createTestData(db) {
  let id = TESTID
  let meta = { id, hello: "world" }
  let data = { data: "blah" }
  await db.collection('spreadsheets').updateOne({ id }, { "$set": meta }, { upsert: true })
  await db.collection(id).insertOne(data)
}

function createCtx() {
  return { 
    event: {
      httpMethod: 'DELETE',
      pathParameters: {
        spreadsheetid: "TEST-SPREADSHEET-ID"
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      }
    },
    env: {
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true'
    },
    state: { }
  }
}

function mockdb(callback, deleteCallback) {
  return {
    collection: () => {
      return {
        findOne: callback,
        deleteOne: deleteCallback
      }
    }
  }
}