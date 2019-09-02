require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')
const { metaHandler, fetchMetadata, updateMetadata } = require('../lib/meta')
const awsParamStore = require('aws-param-store')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// supersheets.auth0.com | danieljyoo@goalbookapp.com
const TOKEN = process.env.AUTH0_TOKEN 

// Present Levels Statement Data
// const GOOGLESPREADSHEET_ID = "1DWu7BBWo1jq-u0ZIXvrMtgGvNvieP7-MznVAf_GQlBo"

describe('fetchMetadata', () => {
  let token = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  })
  beforeEach(async () => {
    axios.defaults.baseURL = process.env.GOOGLESHEETS_BASE_URL
    axios.defaults.params = { }
  })
  afterEach(async () => {
  })
  it ("should fetch metadata from spreadsheet", async () => {
    let metadata = await fetchMetadata(axios, GOOGLESPREADSHEET_ID, {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      idptoken: token
    })
    expect(metadata).toMatchObject({
      "id": "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U",
      "title": "Goalbook Fist to Five Backend"
    })
    expect(metadata.sheets.length).toBe(2)
    expect(metadata.sheets[0]).toMatchObject({
      "id": 0,
      "index": 0,
      "sheetType": "GRID",
      "title": "questions"
    })
  })
})

describe('updateMetadata', () => {
  const TESTID = "TEST-SPREADSHEET-ID"
  let client = null
  let db = null
  let plugin = new MongoDBPlugin()
  beforeEach(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterEach(async () => {
    await client.close()
    db = null
  })
  it ("should create and update new sheet metadata in mongo", async () => {
    let meta = { id: TESTID, hello: "world", foo: "bar" }
    let res = await updateMetadata(db, meta)
    expect(res).toMatchObject(meta)
    let updated = { id: TESTID, hello: "updated" }
    res = await updateMetadata(db, updated)
    expect(res).toMatchObject({
      id: "TEST-SPREADSHEET-ID", 
      hello: "updated", 
      foo: "bar"
    })
  })
  it ("should add missing created fields if updating metadata", async () => {
    let meta = { id: TESTID, hello: "world", foo: "bar" }
    let user = { userid: "USER-ID", email: "user@email.com", org: "myorg.org" }
    let res = await updateMetadata(db, meta, user)
    expect(res).toMatchObject({
      created_at: expect.anything(),
      created_by: "USER-ID",
      created_by_email: "user@email.com",
      created_by_org: "myorg.org",
      updated_at: expect.anything(),
      updated_by: "USER-ID",
      updated_by_email: "user@email.com",
      updated_by_org: "myorg.org",
    })
  })
})

describe('Error Handling', () => {
  let func = null
  let client = null
  let db = null
  beforeAll(async () => {
    let plugin = new MongoDBPlugin()
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await deleteMetadata(db, GOOGLESPREADSHEET_ID)
  })
  afterAll(async () => {
    if (client) {
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
    let ctx = createCtx() 
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
  it ("should return 401 Unauthorized if user is updating meta loaded by another org", async () => {
    await deleteMetadata(db, GOOGLESPREADSHEET_ID)
    await saveMetadata(db, GOOGLESPREADSHEET_ID, {
      id: GOOGLESPREADSHEET_ID,
      created_by_org: "someother.org"
    })
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ("should return 404 Not Found for a bad Google sheet id", async () => {
    let ctx = createCtx()
    ctx.event.pathParameters.spreadsheetid = "BAD-SPREADSHEET-ID"
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Google Spreadsheet BAD-SPREADSHEET-ID could not be found.`
    })
  })
  it ("should return 500 if there is an error saving to Mongo", async () => {
    let ctx = createCtx()
    ctx.env.FUNC_MONGODB_URI = process.env.FUNC_MONGODB_URI_READONLY // readonly MongoDb connection
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Failed to save metadata for ${GOOGLESPREADSHEET_ID}`
    })
  })
})

describe('Function', () => {
  let func = null
  let client = null
  let db = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
    let plugin = new MongoDBPlugin()
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await deleteMetadata(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await func.invokeTeardown()
    if (client) {
      await client.close()
      db = null
    }
  })
  it ("should create new Supersheet metadata", async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      uuid: expect.stringMatching(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/),
      created_by: "google-oauth2|107764139004828737326",
      created_by_email: "danieljyoo@goalbookapp.com",
      created_by_org: "goalbookapp.com",
      created_at: expect.anything()
    })
    expect(body.updated_by).toBeFalsy()
  })
  it ("should update Supersheet metadata", async () => {
    let ctx = createCtx()
    await func.invoke(ctx)  // First create a new one
    let createBody = JSON.parse(ctx.response.body)
    await func.invoke(ctx)  // Now update
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let updateBody = JSON.parse(ctx.response.body)
    expect(updateBody).toMatchObject({
      updated_by: "google-oauth2|107764139004828737326",
      updated_by_email: "danieljyoo@goalbookapp.com",
      updated_by_org: "goalbookapp.com",
      updated_at: expect.anything()
    })
    expect(updateBody.uuid).toEqual(createBody.uuid)
    expect(updateBody.created_at).toEqual(createBody.created_at)
    expect(new Date(updateBody.updated_at).getTime()).toBeGreaterThan(new Date(updateBody.created_at).getTime())
  })
})


function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TOKEN
      },
      stageVariables: {
        //FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    },
    env: {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      //GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true',
      FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: '/supersheetsio/shared/FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN'
    }
  }
}

async function deleteMetadata(db, id) {
  return await db.collection('spreadsheets').deleteOne({ id })
}

async function saveMetadata(db, id, metadata) {
  return await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}