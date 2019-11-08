require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { findStatus } = require('../lib/status')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

// Supersheets Public View GoogleDoc Test
const GOOGLESPREADSHEET_DOCS_ID = "1xyhRUvGTAbbOPFPNB-05Xn6rUT60wNUXJxtGY5RWzpU"

describe('Error Handling', () => {
  let func = null
  let client = null
  let db = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ('should throw error if getting metadata from Mongo', async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(null, new Error("Error in mongodb"))
    await func.invoke(ctx)
    expect(ctx.error).toBeTruthy()
    expect(ctx.error.message).toEqual("Error in mongodb")
  })
  it ('should throw error fetching a sheet from Google Sheets API', async () => {
    let ctx = createCtx()
    ctx.state.metadata = testmetadata()
    ctx.state.status = teststatus()
    ctx.state.mongodb = mockdb(ctx.state.status)
    ctx.state.sheetsapi = mockaxios(null, new Error("Error fetching from Google Sheets"))
    ctx.state.docsapi = mockaxios({ hello: "world" })
    await func.invoke(ctx)
    expect(ctx.error).toBeTruthy()
    expect(ctx.error.message).toEqual("Error fetching from Google Sheets")
  })
})

describe('Load', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let statusuuid = "STATUS-UUID"
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  }, 60 * 1000)
  afterAll(async () => {
    await client.close()
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await deletemeta(db, GOOGLESPREADSHEET_ID)
    await deletestatus(db, statusuuid)
    await func.invokeTeardown()
  })
  it ('should do a new load with no datatypes config', async () => {
    await initstatus(db, statusuuid)
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.error).toBeFalsy()
    let metadata = await getmeta(db, GOOGLESPREADSHEET_ID)
    expect(metadata).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7
    })
  })
  it ('should do a reload with no datatypes config', async () => {
    await initmeta(db, GOOGLESPREADSHEET_ID)
    await initstatus(db, statusuuid)
    let ctx = createCtx()
    await func.invoke(ctx)
    console.log(ctx.error)
    expect(ctx.error).toBeFalsy()
    let metadata = await getmeta(db, GOOGLESPREADSHEET_ID)
    expect(metadata).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7
    })
    expect(metadata.schema.columns.filter(col => !col.reserved).map(col => col.name)).toEqual([ 
      "question_id", 
      "question_text", 
      "created_at", 
      "student_name", 
      "student_response" 
    ])
    expect(metadata.schema.columns.filter(col => !col.reserved).map(col => col.sample)).toEqual([ 
      "Q1", 
      "How ready do you feel for our quiz tomorrow?", 
      "2017-04-24T23:39:16.718Z", 
      "Johnny Doe", 
      "2"  // by default mode is 'FORMATTED' so everything is a string
    ])
    let status = await findStatus(db, { uuid: "STATUS-UUID" })
    expect(status).toMatchObject({
      status: "SUCCESS",
      num_sheets_loaded: metadata.sheets.length,
      num_sheets_total: metadata.sheets.length,
      sheets_loaded: metadata.sheets.map(s => s.title),
      error: null,
      completed_at: expect.anything(),
      duration: expect.anything()
    })
  }, 120 * 1000)
  it ('should do a reload with datatypes', async () => {
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
    await initstatus(db, statusuuid)
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.error).toBeFalsy()
    let metadata = await getmeta(db, GOOGLESPREADSHEET_ID)
    expect(metadata).toMatchObject({
      id: GOOGLESPREADSHEET_ID,
      title: "Goalbook Fist to Five Backend",
      nrows: 6,
      ncols: 7
    })
    expect(metadata.schema.columns.filter(col => !col.reserved).map(col => col.datatype)).toEqual([ 
      "String", 
      "String", 
      "Datetime", 
      "String", 
      "Number"
    ])
    expect(metadata.schema.columns.filter(col => !col.reserved).map(col => col.sample)).toEqual([ 
      "Q1", 
      "How ready do you feel for our quiz tomorrow?", 
      //"2017-04-24T23:39:16.718Z", 
      expect.anything(),
      "Johnny Doe", 
      2
    ])
  }, 120 * 1000)
})

describe('Load Spreadsheet with Google Docs', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let statusuuid = "STATUS-DOC-UUID"
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  }, 60 * 1000)
  afterAll(async () => {
    await deletemeta(db, GOOGLESPREADSHEET_DOCS_ID)
    await deletestatus(db, statusuuid)
    await client.close()
  })
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it ('should do a load with GoogleDoc datatype', async () => {
    await initdocmeta(db, GOOGLESPREADSHEET_DOCS_ID, {
      mode: "UNFORMATTED",
      datatypes: {
        "id": "Number",
        "writer": "String",
        "passage": "GoogleDoc",
      }
    })
    await initdocstatus(db, statusuuid)
    let ctx = createCtx(GOOGLESPREADSHEET_DOCS_ID, statusuuid)
    await func.invoke(ctx)
    expect(ctx.error).toBeFalsy()
    let metadata = await getmeta(db, GOOGLESPREADSHEET_DOCS_ID)
    expect(metadata).toMatchObject({
      id: GOOGLESPREADSHEET_DOCS_ID,
      title: "Supersheets Public View GoogleDoc Test",
      nrows: 3,
      ncols: 3
    })
    //console.log("METADATA", JSON.stringify(metadata, null, 2))
    expect(metadata.schema.columns.filter(col => !col.reserved).map(col => col.name)).toEqual([ 
      "id",
      "writer",
      "passage" 
    ])
    let samples = metadata.schema.columns.filter(col => !col.reserved).map(col => col.sample)
    expect(samples).toEqual([ 
      123, 
      "danieljyoo@goalbookapp.com", 
      expect.anything()
    ])
    expect(samples[2]).toMatchObject({
      title: "The Gettysburg Address"
    })
    expect(metadata.schema.docs).toBeTruthy()
    expect(metadata.schema.docs).toMatchObject({
      "passage": {
        "name": "passage",
        "fields": [
          {
            "datatype": "String",
            "name": "_url",
            "reserved": true,
            "sample": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
          },
          {
            "datatype": "String",
            "name": "_docid",
            "reserved": true,
            "sample": "1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8"
          },
          {
            "datatype": "String",
            "name": "_title",
            "reserved": true,
            "sample": "Supersheets Public Doc Test v2"
          },
          {
            "datatype": "String",
            "name": "_text",
            "reserved": true,
            "sample": expect.stringMatching(/^The Gettysburg Address/)
          },
          {
            "datatype": "String",
            "name": "_content",
            "reserved": true,
            "sample": null
          },
          {
            "name": "title",
            "datatype": "String",
            "reserved": false,
            "sample": "The Gettysburg Address"
          },
          {
            "name": "description",
            "datatype": "String",
            "reserved": false,
            "sample": "Four score and seven years ago our fathers brought forth on this continent ..."
          }
        ]
      }
    })
    let status = await findStatus(db, { uuid: statusuuid })
    expect(status).toMatchObject({
      status: "SUCCESS",
      num_sheets_loaded: metadata.sheets.length,
      num_sheets_total: metadata.sheets.length,
      sheets_loaded: metadata.sheets.map(s => s.title),
      error: null,
      completed_at: expect.anything(),
      duration: expect.anything()
    })
  }, 120 * 1000)
})

// ctx is a bit different here because we are being directly invoked by another lambda rather than API gateway
// We are expecting all "ctx.env" from the invoking lambda to be stuffed into event.stageVariables
// We get the decoded user and spreadsheetid in the body
function createCtx(id, statusuuid) {
  return { 
    event: {
      stageVariables: {
        GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
        GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
        GOOGLEDOCS_BASE_URL: process.env.GOOGLEDOCS_BASE_URL,
        FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
        FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
      },
      headers: {
        'Content-Type': "application/json"
      },
      body: JSON.stringify({
        user: {
          userid: "goog-auth2|1234",
          email: "danieljyoo@goalbookapp.com",
          org: "goalbookapp.com"
        },
        spreadsheetid: id || GOOGLESPREADSHEET_ID,
        statusid: statusuuid || "STATUS-UUID",
        //datauuid: "NEW-COLLECTION-DATAUUID"
      })
    },
    env: { },
    state: { }
  }
}

function mockdb(response, error) {
  return {
    collection: (name) => {

      return {
        findOne: responseOrError(response, error),
        updateOne: responseOrError(response, error)
      }
    }
  }
}

function mockaxios(response, error) {
  return {
    get: responseOrError(response, error)
  }
}

function responseOrError(response, error) {
  return async () => {
    if (response) return response
    if (error) throw error
    throw new Error("Unknown mock behavior")
  }
}

async function deletemeta(db, id) {
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

async function deletestatus(db, uuid) {
  try {
    await db.collection('status').deleteOne({ uuid })
  } catch (err) {
    console.log(`Could not drop status ${id}`)
  }
}

async function getmeta(db, id) {
  return await  db.collection('spreadsheets').findOne({ id })
}

async function initmeta(db, id, config) {
  let metadata = testmetadata(id, config)
  await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}

async function initdocmeta(db, id, config) {
  let metadata = testdocmetadata(id, config)
  await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}

async function initstatus(db, uuid) {
  let status = teststatus(uuid)
  await db.collection('status').updateOne({ uuid }, { "$set": status }, { upsert: true })
}

async function initdocstatus(db, uuid) {
  let status = testdocstatus(uuid)
  await db.collection('status').updateOne({ uuid }, { "$set": status }, { upsert: true })
}

function testmetadata(id, config) {
  return {
    id: id || GOOGLESPREADSHEET_ID,
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
}

function testdocmetadata(id, config) {
  return {
    id: id || GOOGLESPREADSHEET_DOCS_ID,
    uuid: 'UUID',
    title: "Supersheets Public View GoogleDoc Test",
    sheets: [ {
        title: "Passages"
      }
    ],
    config: config || { }
  }
}

function teststatus(uuid) {
  return { 
    uuid,
    status: "INIT",
    sheet_new_datauuid: "NEW-DATAUUID",
    num_sheets_loaded: 0,
    num_sheets_total: 2,
    sheets_loaded: [ ],
    created_at: new Date(),
    error: null
  }
}

function testdocstatus(uuid) {
  return { 
    uuid,
    status: "INIT",
    sheet_new_datauuid: "NEW-DOC-DATAUUID",
    num_sheets_loaded: 0,
    num_sheets_total: 1,
    sheets_loaded: [ ],
    created_at: new Date(),
    error: null
  }
}


// describe('Function Reload', () => {
//   let func = null
//   let plugin = new MongoDBPlugin()
//   let client = null
//   let db = null
//   beforeEach(async () => {
//     // Import our main function each time which
//     // simulates an AWS "cold start" load
//     func = require('../index.js').func
//     func.logger.logger.prettify = prettify

//     client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
//     db = client.db()
//     await initmeta(db, GOOGLESPREADSHEET_ID)
//   })
//   afterEach(async () => {
//     await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
//     await client.close()
//     // We invoke any teardown handlers so that
//     // middleware can clean up after themselves
//     await func.invokeTeardown()
//   })
//   it ('should return statusCode of 200 OK', async () => {
//     let ctx = createCtx()
//     await func.invoke(ctx)
//     expect(ctx.response).toMatchObject({
//       statusCode: 200
//     })
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toMatchObject({
//       id: GOOGLESPREADSHEET_ID,
//       title: "Goalbook Fist to Five Backend",
//       nrows: 6,
//       ncols: 7,
//       ncells: 22
//     })
//   })
// })


// describe('Load with User Config', () => {
//   let func = null
//   let plugin = new MongoDBPlugin()
//   let client = null
//   let db = null
//   beforeEach(async () => {
//     // Import our main function each time which
//     // simulates an AWS "cold start" load
//     func = require('../index.js').func
//     func.logger.logger.prettify = prettify

//     client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
//     db = client.db()
//     await initmeta(db, GOOGLESPREADSHEET_ID, {
//       mode: "UNFORMATTED",
//       datatypes: {
//         "question_id": "String",
//         // "question_text": "String", // should default to "String"
//         "created_at": "Datetime",
//         "student_name": "String",
//         "student_response": "Number",
//       }
//     })
//   })
//   afterEach(async () => {
//     await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
//     await client.close()
//     // We invoke any teardown handlers so that
//     // middleware can clean up after themselves
//     await func.invokeTeardown()
//   })
//   it ('should return statusCode of 200 OK', async () => {
//     let ctx = createCtx()
//     await func.invoke(ctx)
//     expect(ctx.response).toMatchObject({
//       statusCode: 200
//     })
//     let body = JSON.parse(ctx.response.body)
//     expect(body).toMatchObject({
//       id: GOOGLESPREADSHEET_ID,
//       title: "Goalbook Fist to Five Backend",
//       nrows: 6,
//       ncols: 7,
//       ncells: 22
//     })
//     expect(body.schema.columns.map(col => col.sample)).toEqual([ 
//       "Q1", 
//       "How ready do you feel for our quiz tomorrow?", 
//       "2017-04-24T23:39:16.718Z", 
//       "Johnny Doe", 
//       2
//     ])
//     expect(body.schema.columns.map(col => col.datatype)).toEqual([ 
//       "String", 
//       "String", 
//       "Datetime", 
//       "String", 
//       "Number"
//     ])
//   })
// })
