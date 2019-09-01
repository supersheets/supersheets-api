require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { loadHandler } = require('../lib/load')
const { findStatus } = require('../lib/status')

// Supersheets Public View GoogleDoc Test
const GOOGLESPREADSHEET_DOCS_ID = "1xyhRUvGTAbbOPFPNB-05Xn6rUT60wNUXJxtGY5RWzpU"

describe('Load', () => {
  let token = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    // await deletemeta(db, GOOGLESPREADSHEET_ID)
    // await deletestatus(db, statusuuid)
    if (client) {
      await client.close()
      client = null
      db = null
    }
  })
  it ('should do a reload with no datatypes config', async () => {
    let ctx = createCtx({ mongodb: db, token })
    ctx.state.mongodb = db
    await loadHandler(ctx)
    console.log(JSON.stringify(ctx.state.metadata))
  })
})

function createCtx(options) {
  options = options || { }
  let sheetsapi = axios.create({
    baseURL: process.env.GOOGLESHEETS_BASE_URL
  })
  sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${options.token}`
  let docsapi = axios.create({
    baseURL: process.env.GOOGLEDOCS_BASE_URL
  })
  docsapi.defaults.headers.common['Authorization'] = `Bearer ${options.token}`
  return { 
    event: { },
    env: { },
    state: { 
      mongodb: options.mongodb,
      metadata: createTestMetadata(),
      status: createTestStatus(),
      sheetsapi,
      docsapi
    },
    logger: new LoggerWrapper({ prettify })
  }
}

function createTestMetadata() {
  return {
    id: GOOGLESPREADSHEET_DOCS_ID,
    sheets: [ { title: "Passages" } ]
  }
}

function createTestStatus() {
  return {
    uuid: "STATUS-UUID",
    sheet_id: GOOGLESPREADSHEET_DOCS_ID,
    status: "INIT",
    sheet_current_datauuid: "OLD-DATA-UUID",
    sheet_new_datauuid: "NEW-DATA-UUID",
    num_sheets_loaded: 0,
    num_sheets_total: 1,
    sheets_loaded: [ ],
    created_at: new Date(),
    error: null
  }
}
 
// GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
// GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY,
// GOOGLEDOCS_BASE_URL: process.env.GOOGLEDOCS_BASE_URL,
// FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI,
// FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH


// async function deletemeta(db, id) {
//   let metadata = null
//   try {
//     metadata = await db.collection('spreadsheets').findOne({ id })
//     if (metadata) {
//       await db.collection('spreadsheets').deleteOne({ id })
//     }
//   } catch (err) {
//     console.log(`Could not delete metadata ${id}`)
//   }
//   try {
//     await db.collection(id).drop()
//   } catch (err) {
//     console.log(`Could not drop collection ${id}`)
//   }
//   if (metadata && metadata.datauuid) {
//     try {
//       await db.collection(metadata.datauuid).drop()
//     } catch (err) {
//       console.log(`Could not drop collection ${metadata.datauuid}`)
//     }
//   }
// }

// async function deletestatus(db, uuid) {
//   try {
//     await db.collection('status').deleteOne({ uuid })
//   } catch (err) {
//     console.log(`Could not drop status ${id}`)
//   }
// }

// async function getmeta(db, id) {
//   return await  db.collection('spreadsheets').findOne({ id })
// }

// async function initmeta(db, id, config) {
//   let metadata = testmetadata(id, config)
//   await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
// }

// async function initdocmeta(db, id, config) {
//   let metadata = testdocmetadata(id, config)
//   await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
// }

// async function initstatus(db, uuid) {
//   let status = teststatus(uuid)
//   await db.collection('status').updateOne({ uuid }, { "$set": status }, { upsert: true })
// }

// async function initdocstatus(db, uuid) {
//   let status = testdocstatus(uuid)
//   await db.collection('status').updateOne({ uuid }, { "$set": status }, { upsert: true })
// }

// function testmetadata(id, config) {
//   return {
//     id: id || GOOGLESPREADSHEET_ID,
//     uuid: 'UUID',
//     title: "Goalbook Fist to Five Backend",
//     sheets: [ {
//         title: "questions"
//       }, {
//         title: "answers"
//       }
//     ],
//     config: config || { }
//   }
// }

// function testdocmetadata(id, config) {
//   return {
//     id: id || GOOGLESPREADSHEET_DOCS_ID,
//     uuid: 'UUID',
//     title: "Supersheets Public View GoogleDoc Test",
//     sheets: [ {
//         title: "Passages"
//       }
//     ],
//     config: config || { }
//   }
// }

// function teststatus(uuid) {
//   return { 
//     uuid,
//     status: "INIT",
//     sheet_new_datauuid: "NEW-DATAUUID",
//     num_sheets_loaded: 0,
//     num_sheets_total: 2,
//     sheets_loaded: [ ],
//     created_at: new Date(),
//     error: null
//   }
// }

// function testdocstatus(uuid) {
//   return { 
//     uuid,
//     status: "INIT",
//     sheet_new_datauuid: "NEW-DOC-DATAUUID",
//     num_sheets_loaded: 0,
//     num_sheets_total: 1,
//     sheets_loaded: [ ],
//     created_at: new Date(),
//     error: null
//   }
// }
