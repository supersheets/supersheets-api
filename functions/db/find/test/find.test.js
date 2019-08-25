require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')

const GOOGLESPREADSHEET_ID = "TEST-ID"

describe('Basic Queries', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let func = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await createSupersheet(db)
  }, 30 * 1000)
  afterAll(async () => {
    await deleteSupersheet(db)
    await client.close()
    db = null
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ("should find multiple results", async () => {
    let ctx = createCtx({ query: { question_id: "Q1" } }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query:  { 
        question_id: "Q1" 
      } 
    })
    expect(body.count).toBe(2)
    expect(body.result.length).toBe(2)
    expect(body.result[0]).toMatchObject({
      question_id: "Q1"
    })
    expect(body.result.map(doc => doc.answer).sort()).toEqual([1, 2])
  }, 30 * 1000)
  it ("should not find multiple results", async () => {
    let ctx = createCtx({ query: { question_id: "NOID" } }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.count).toBe(0)
    expect(body.result).toEqual([])
  }, 30 * 1000)
  it ("should find one result", async () => {
    let ctx = createCtx({ 
      query: { 
        "question_id": "Q1" 
      },
      one: true 
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body) 
    expect(body.count).toBe(1)
    expect(body.result).toMatchObject({
      question_id: "Q1"
    })
  }, 30 * 1000)
  it ("should not find one result", async () => {
    let ctx = createCtx({ 
      query: { 
        "question_id": "NOID" 
      },
      one: true 
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.count).toBe(0)
    expect(body.result).toEqual(null)
  }, 30 * 1000)
})

describe('Advanced Queries', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let func = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await createSupersheet(db)
  }, 30 * 1000)
  afterAll(async () => {
    await deleteSupersheet(db)
    await client.close()
    db = null
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ("should limit results", async () => {
    let ctx = createCtx({ query: { question_id: "Q1" }, limit: 1 }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      query:  { 
        question_id: "Q1" 
      } 
    })
    expect(body.count).toBe(1)
    expect(body.result.length).toBe(1)
  }, 30 * 1000)
  it ("should sort results", async () => {
    let ctx = createCtx({ query: { question_id: "Q1" }, sort: [ [ "answer", -1 ] ] }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body.count).toBe(2)
    expect(body.result.map(doc => doc.answer)).toEqual([ 2, 1 ])
  }, 30 * 1000)
  it ("should filter returns fields via projection", async () => {
    let ctx = createCtx({ query: { question_id: "Q1" }, projection: { answer: 1 }, sort: [ [ "answer", -1 ] ] })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body) 
    expect(body.count).toBe(2)
    expect(body.result[0]).toEqual({ 
      "_id": expect.anything(),
      answer: 2 
    })
  }, 30 * 1000)
})

function createCtx(body) {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      stageVariables: {
        FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
      }
    }
  }
}

async function createSupersheet(db) {
  let metadata = {
    id: GOOGLESPREADSHEET_ID,
    datauuid: "TEST-DATA-UUID"
  }
  await db.collection('spreadsheets').updateOne({ id: metadata.id }, { "$set": metadata }, { upsert: true })
  await db.collection(metadata.datauuid).insertMany([
    { question_id: "Q1", answer: 1 },
    { question_id: "Q1", answer: 2 },
    { question_id: "Q2", answer: 1 }
  ], { w: 1 })
}

async function deleteSupersheet(db) {
  await db.collection('spreadsheets').deleteOne({ id: GOOGLESPREADSHEET_ID })
  await db.collection("TEST-DATA-UUID").drop()
}