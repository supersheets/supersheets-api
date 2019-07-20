require('dotenv').config()
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')
const { updateHandler, saveMetadata } = require('../lib/update')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// supersheets.auth0.com | danieljyoo@goalbookapp.com
const TOKEN = process.env.AUTH0_TOKEN 

describe('Error Handling', () => {
  let func = null
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
  it ("should return 404 Not Found for a bad supersheet id", async () => {
    let ctx = createCtx()
    ctx.event.pathParameters.spreadsheetid = "BAD-SPREADSHEET-ID"
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage:  `Could not find metadata with id BAD-SPREADSHEET-ID`
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
      errorMessage: `Failed to update metadata for ${GOOGLESPREADSHEET_ID}`
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
  it ("should update Supersheet metadata", async () => {
    await createTestMetadata(db, GOOGLESPREADSHEET_ID)
    let ctx = createCtx()
    await func.invoke(ctx)  // Now update
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let updateBody = JSON.parse(ctx.response.body)
    expect(updateBody).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      config: {
        datatypes: {
          created_at: "Datetime"
        }
      }
    })
  })
})


function createCtx() {
  return { 
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      body: JSON.stringify({
        config: {
          datatypes: {
            "created_at": "Datetime"
          }
        }
      }),
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
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true'
    }
  }
}

async function deleteMetadata(db, id) {
  return await db.collection('spreadsheets').deleteOne({ id })
}

async function createTestMetadata(db, id) {
  let metadata = {
    id
  }
  return await saveMetadata(db, metadata)
}