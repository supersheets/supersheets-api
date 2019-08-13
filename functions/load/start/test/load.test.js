require('dotenv').config()
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const status = require('../lib/status')

// Goalbook Fist to Five Backend
const GOOGLESPREADSHEET_ID = "1liBHwxOdE7nTonL1Cv-5hzy8UGBeLpx0mufIq5dR8-U"

const TOKEN = process.env.AUTH0_TOKEN 

describe('Error Handling', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await initmeta(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
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
    ctx.state.mongodb = mockdb({
      findOne: async () => {
        return { created_by_org: "some-other-org" }
      }
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
    ctx.state.mongodb = mockdb({
      findOne: async () => {
        throw new Error("error in find")
      }
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
  it ('should return 500 error if fail to create new status in mongo', async () => {
    let ctx = createCtx()
    let metadata = await getmeta(db, GOOGLESPREADSHEET_ID)
    ctx.state.mongodb = mockdb({
      findOne: async () => { return metadata },
      insertOne: async () => {
        throw new Error("Error inserting to mongo")
      }
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error creating load status for sheet ${metadata.id}`
    })
  })
  it ('should return 500 error for a lambda request error', async () => {
    let ctx = createCtx()
    ctx.state.invokelambda = async () => { throw new Error("Lambda request error") }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Failed to invoke load function: Lambda request error`
    })
  })
  it ('should return 500 error if lambda invocation returns handled error', async () => {
    let ctx = createCtx()
    let data = {
      FunctionError: "Handled"
    }
    ctx.state.invokelambda = async () => { 
      return data
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Failed to invoke load function: Lambda invocation returned an handled error: ${JSON.stringify(data)}`
    })
  })
  it ('should return 500 error if lambda invocation returns handled error', async () => {
    let ctx = createCtx()
    let data = {
      FunctionError: "Unhandled"
    }
    ctx.state.invokelambda = async () => { 
      return data
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Failed to invoke load function: Lambda invocation threw an unhandled error: ${JSON.stringify(data)}`
    })
  })
})

describe('Func', () => {
  let func = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeEach(async () => {
    // Import our main function each time which
    // simulates an AWS "cold start" load
    func = require('../index.js').func
    func.logger.logger.prettify = prettify

    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await initmeta(db, GOOGLESPREADSHEET_ID)
  })
  afterEach(async () => {
    await deleteSupersheet(db, GOOGLESPREADSHEET_ID)
    await client.close()
    // We invoke any teardown handlers so that
    // middleware can clean up after themselves
    await func.invokeTeardown()
  })
  it ('should invoke the loader lambda in DryRun mode', async () => {
    let ctx = createCtx()
    ctx.event.queryStringParameters = { "dryrun": "true" }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      metadata_uuid: "UUID",
      status_uuid: expect.anything(),
      invokeStatusCode: 204
    })
  })
  it ('should invoke the loader lambda', async () => {
    let ctx = createCtx()
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    console.log(JSON.stringify(body, null, 2))
    expect(body).toMatchObject({
      metadata_uuid: "UUID",
      status_uuid: expect.anything(),
      invokeStatusCode: 202
    })
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

function mockdb(callbacks) {
  return {
    collection: () => {
      return callbacks
    }
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
  try {
    await db.collection('status').deleteOne({ sheet_id: id })
  } catch (err) {
    console.log(`Could not drop status ${id}`)
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

async function getmeta(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}


// describe('Function First Load', () => {
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
//     expect(body.schema.columns.map(col => col.name)).toEqual([ 
//       "question_id", 
//       "question_text", 
//       "created_at", 
//       "student_name", 
//       "student_response" 
//     ])
//     expect(body.schema.columns.map(col => col.sample)).toEqual([ 
//       "Q1", 
//       "How ready do you feel for our quiz tomorrow?", 
//       "2017-04-24T23:39:16.718Z", 
//       "Johnny Doe", 
//       "2"  // by default mode is 'FORMATTED' so everything is a string
//     ])
//     // Load Status Checks
//     // TODO: probably need more status specific testing than this
//     let stat = await status.getStatus(ctx.state.mongodb, { sheet_id: body.id })
//     expect(stat).toMatchObject({
//       status: "SUCCESS",
//       sheet_id: body.id,
//       sheet_uuid: body.uuid,
//       sheet_new_datauuid: body.datauuid,
//       num_sheets_loaded: body.sheets.length,
//       num_sheets_total: body.sheets.length,
//       sheets_loaded: body.sheets.map(s => s.title),
//       error: null,
//       completed_at: expect.anything(),
//       duration: expect.anything()
//     })
//   })
// })

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

// describe('Function Reload with User Config', () => {
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