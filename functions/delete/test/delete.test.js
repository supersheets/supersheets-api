require('dotenv').config()
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')
const TESTID = "TEST-SPREADSHEET-ID"

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
        'Content-Type': 'application/json'
      }
    },
    env: {
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    }
  }
}