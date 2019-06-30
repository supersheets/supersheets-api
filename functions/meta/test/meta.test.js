require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')
const { metaHandler, fetchMetadata, updateMetadata } = require('../lib/meta')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// Present Levels Statement Data
// const GOOGLESPREADSHEET_ID = "1DWu7BBWo1jq-u0ZIXvrMtgGvNvieP7-MznVAf_GQlBo"

describe('fetchMetadata', () => {
  beforeEach(async () => {
    axios.defaults.baseURL = process.env.GOOGLESHEETS_BASE_URL
    axios.defaults.params = { }
    axios.defaults.params['key'] = process.env.GOOGLESHEETS_API_KEY
  })
  afterEach(async () => {
  })
  it ("should fetch metadata from spreadsheet", async () => {
    let metadata = await fetchMetadata(axios, GOOGLESPREADSHEET_ID, {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY
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
})

describe('Function', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ("should fetch and update sheet metadata", async () => {
    let ctx = createCtx() 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    console.log(JSON.stringify(body, null, 2))
    //expect(body).toMatchObject()
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
        'Content-Type': 'application/json'
      },
      stageVariables: {
        //FUNC_PARAMETERSTORE_PATH: '/supersheetsio/dev'
      }
    },
    env: {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    }
  }
}