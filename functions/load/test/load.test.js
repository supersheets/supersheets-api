require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

const TOKEN = process.env.AUTH0_TOKEN 

describe('Error Handling', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
    await initmeta(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await client.close()
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should return 401 Unauthorized if user is unauthenticated', async () => {
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
  it ('should return 401 Unauthorized if user part of a different org', async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(async () => {
      return { created_by_org: "some-other-org" }
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 401
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: "Unauthorized"
    })
  })
  it ('should return 500 Internal Server Error if error finding metadata in mongo', async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(async () => {
      throw new Error("error in find")
    }) 
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up metadata for ${GOOGLESPREADSHEET_ID}`
    })
  })
  it ('should return 500 Internal Server Error if error fetching a sheet from Google Sheets API', async () => {
    let ctx = createCtx()
    ctx.state.axios = mockaxios(async () => {
      throw new Error("Error fetching from Google Sheets")
    })
    await func.invoke(ctx)
    console.log(ctx.response.body)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error loading sheet questions: Error fetching from Google Sheets`
    })
  })
})

describe('Function First Load', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
    await initmeta(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await client.close()
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should return statusCode of 200 OK', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7,
      ncells: 22
    })
    expect(body.schema.columns.map(col => col.name)).toEqual([ 
      "question_id", 
      "question_text", 
      "created_at", 
      "student_name", 
      "student_response" 
    ])
    expect(body.schema.columns.map(col => col.sample)).toEqual([ 
      "Q1", 
      "How ready do you feel for our quiz tomorrow?", 
      "2017-04-24T23:39:16.718Z", 
      "Johnny Doe", 
      "2"  // by default mode is 'FORMATTED' so everything is a string
    ])
  })
})

describe('Function Reload', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
    await initmeta(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await client.close()
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should return statusCode of 200 OK', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7,
      ncells: 22
    })
  })
})

describe('Function Reload with User Config', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    let db = client.db()
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
    await initmeta(db, GOOGLESPREADSHEET_ID, {
      mode: "UNFORMATTED",
      datatypes: {
        "question_id": "String",
        // "question_text": "String", // should default to "String"
        "created_at": "Datetime",
        "student_name": "String",
        "student_response": "Number",
      }
    })
  })
  afterEach(async () => {
    await client.close()
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should return statusCode of 200 OK', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7,
      ncells: 22
    })
    expect(body.schema.columns.map(col => col.sample)).toEqual([ 
      "Q1", 
      "How ready do you feel for our quiz tomorrow?", 
      "2017-04-24T23:39:16.718Z", 
      "Johnny Doe", 
      2
    ])
    expect(body.schema.columns.map(col => col.datatype)).toEqual([ 
      "String", 
      "String", 
      "Datetime", 
      "String", 
      "Number"
    ])
  })
})

function createCtx() {
  return { 
    event: {
      pathParameters: {
        spreadsheetid: GOOGLESPREADSHEET_ID
      },
      headers: {
        'Authorization': TOKEN
      }
    },
    env: {
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
      FUNC_AUTH0_DOMAIN: process.env.FUNC_AUTH0_DOMAIN,
      FUNC_AUTH0_SKIP_VERIFICATION: 'true'
    },
    state: { }
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

function mockaxios(callback) {
  return {
    get: callback
  }
}

async function deleteSupersheet(db, id) {
  let metadata = null
  try {
    metadata = await db.collection('spreadsheets').findOne({ id })
    if (metadata) {
      await db.collection('spreadsheets').deleteOne({ id })
    }
  } catch (err) {
    console.log(`Could not delete metadata ${id}`)
  }
  try {
    await db.collection(id).drop()
  } catch (err) {
    console.log(`Could not drop collection ${id}`)
  }
  if (metadata && metadata.datauuid) {
    try {
      await db.collection(metadata.datauuid).drop()
    } catch (err) {
      console.log(`Could not drop collection ${metadata.datauuid}`)
    }
  }
}

async function initmeta(db, id, config) {
  let metadata = {
    id,
    uuid: 'UUID',
    title: "Goalbook Fist to Five Backend",
    sheets: [ {
        title: "questions"
      }, {
        title: "answers"
      }
    ],
    config: config || { }
  }
  await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}