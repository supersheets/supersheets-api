require('dotenv').config()
const uuidV4 = require('uuid/v4')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// danieljyoo@goalbookapp.com
const TOKEN = process.env.AUTH_TOKEN 

describe('Error Handling', () => {
  let func = null
  let client = null
  let db = null
  let uuid = uuidV4()
  beforeAll(async () => {
    let plugin = new MongoDBPlugin()
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await deleteStatus(db, uuid)
      await client.close()
    }
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should return 401 Unauthorized if user not authed", async () => {
    let ctx = createCtx(uuid) 
    delete ctx.event.headers['Authorization']
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ("should return 401 Unauthorized if user is updating status loaded by another org", async () => {
    await deleteStatus(db, uuid)
    await saveStatus(db, uuid, {
      uuid,
      created_by_org: "someother.org"
    })
    let ctx = createCtx(uuid) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ("should return 404 Not Found for a bad status uuid id", async () => {
    await saveStatus(db, uuid, { uuid })
    let ctx = createCtx(uuid)
    ctx.event.pathParameters.statusid = "BAD-STATUS-ID"
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Load status BAD-STATUS-ID does not exist`
    })
  })
})

describe('Function', () => {
  let func = null
  let client = null
  let db = null
  let uuid = uuidV4()
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    let plugin = new MongoDBPlugin()
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterEach(async () => {
    await func.invokeTeardown()
    if (client) {
      await deleteStatus(db, uuid)
      await client.close()
      db = null
    }
  })
  it ("should return status for a load", async () => {
    await saveStatus(db, uuid, {
      uuid,
      created_by_org: "goalbookapp.com",
      status: "SUCCESS"
    })
    let ctx = createCtx(uuid)
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      uuid,
      created_by_org: "goalbookapp.com",
      status: "SUCCESS"
    })
  })
})


function createCtx(statusid) {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID,
        statusid,
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      stageVariables: {
        //FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    },
    env: {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true',
      JWKS_URI: process.env.JWKS_URI,
      JWKS_SKIP_VERIFICATION: 'true'
    }
  }
}

async function deleteStatus(db, uuid) {
  return await db.collection('status').deleteOne({ uuid })
}

async function saveStatus(db, uuid, status) {
  return await db.collection('status').updateOne({ uuid }, { "$set": status }, { upsert: true })
}
