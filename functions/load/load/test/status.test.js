require('dotenv').config()
const uuidV4 = require('uuid/v4')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')

const { 
  statusHandler, 
  errorStatusHandler, 
  progressStatus,
  completeStatus,
  failStatus,
  findStatus,
  updateStatus,
  deleteStatus
} = require('../lib/status')

const NOOP = async () => { }

describe('Status Handler', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let status = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    client = null
    db = null
  })
  beforeEach(async () => {
    status = await createTestStatus(db)
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid: status.uuid })
    status = null
  })
  it ('find a status and then complete it', async () => {
    let ctx = createTestCtx({
      statusid: status.uuid,
      mongodb: db
    })
    await statusHandler(ctx, async () => {
      expect(ctx.state.status).toBeTruthy()
      expect(ctx.state.status).toMatchObject(status)
    })
    let completed = await findStatus(db, { uuid: status.uuid })
    expect(completed).toMatchObject({
      status: "SUCCESS"
    })
  })
  it ('should throw if no statusid provided', async () => {
    let ctx = createTestCtx()
    ctx.event.body.statusid = null
    let error = null
    try {
      await statusHandler(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual("No status uuid provided ('ctx.event.body.statusid')")
  })

  it ('should throw if mongodb not set', async () => {
    let ctx = createTestCtx({
      statusid: status.uuid
    })
    ctx.state.mongodb = null
    let error = null
    try {
      await statusHandler(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`MongoDB connection not provided ('ctx.state.mongodb')`)
  })
  it ('should throw if no status found', async () => {
    let ctx = createTestCtx({
      statusid: "BAD-STATUS-UUID",
      mongodb: db
    })
    let error = null
    try {
      await statusHandler(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Status BAD-STATUS-UUID does not exist`)
  })
  it ('should throw if mongodb throws', async () => {
    let mockdb = {
      collection: () => {
        return { 
          findOne: () => { throw new Error("MongoDB error") }
        }
      }
    }
    let ctx = createTestCtx({
      statusid: "BAD-STATUS-UUID",
      mongodb: mockdb
    })
    let error = null
    try {
      await statusHandler(ctx, NOOP)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`MongoDB error`)
  })
})

describe('Error Handler', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let status = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    client = null
    db = null
  })
  beforeEach(async () => {
    status = await createTestStatus(db)
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid: status.uuid })
    status = null
  })
  it ('should not throw ...', async () => {
    // TODO
  })
  it ('should update error status with uncaught error info', async () => {
    let ctx = createTestCtx({
      statusid: status.uuid,
      mongodb: db,
      error: new Error("Some uncaught error")
    })
    await errorStatusHandler(ctx, NOOP)
    let error = await findStatus(db, { uuid: status.uuid })
    expect(error).toMatchObject({
      status: "FAILURE",
      error: true,
      errorMessage: "Some uncaught error",
      errorStack: expect.anything()
    })
  })
})

describe('Status DB Updates', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let status = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    db = null
    status = null
  })
  beforeEach(async () => {
    status = await createTestStatus(db)
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid: status.uuid })
  })
  it ('should have created a status', async () => {
    expect(status).toBeTruthy()
  })
  it ('should return null if status does not exist', async () => {
    let notfound = await findStatus(db, { uuid: "BAD-UUID"})
    expect(notfound).toEqual(null)
  })
  it ('should update a status with sheet progress', async () => {
    let sheet1 = { title: "Sheet1" }
    await progressStatus(db, status, sheet1)
    let saved = await findStatus(db, { uuid: status.uuid })
    expect(saved).toMatchObject({
      status: "PROGRESS",
      num_sheets_loaded: 1,
      sheets_loaded: [ sheet1.title ]
    })
    let sheet2 = { title: "Sheet2" }
    await progressStatus(db, status, sheet2)
    saved = await findStatus(db, { uuid: status.uuid })
    expect(saved).toMatchObject({
      status: "PROGRESS",
      num_sheets_loaded: 2,
      sheets_loaded: [ sheet1.title, sheet2.title ]
    })
  })
  it ('should set a status to be completed', async () => {
    await completeStatus(db, status)
    let saved = await findStatus(db, { uuid: status.uuid })
    expect(saved).toMatchObject({
      status: "SUCCESS",
      updated_at: expect.anything(),
      completed_at: expect.anything(),
      duration: expect.anything()
    })
  })
  it ('should set a status to have failed', async () => {
    await failStatus(db, status, new Error("some error message"))
    let saved = await findStatus(db, { uuid: status.uuid })
    expect(saved).toMatchObject({
      status: 'FAILURE',
      completed_at: expect.anything(),
      duration: expect.anything(),
      error: true,
      errorMessage: "some error message",
      errorStack: expect.anything()
    })
  })
})

async function createTestStatus(db, options) {
  options = options || { }
  let user = options.user || {
    userid: "1234",
    email: "danieljyoo@funcmatic.com",
    org: "funcmatic.com"
  }
  let status = {
    uuid: options.uuid || uuidV4(),
    status: options.status || "INIT",
    sheets_loaded: [ ],
    created_at: options.created_at || new Date(),
    created_by: user.userid,
    created_by_email: user.email,
    created_by_org: user.org
  }
  try {
    await updateStatus(db, { uuid: status.uuid }, { "$set": status })
  } catch (err) {
    console.error(err)
  }
  
  return status
}

function createTestCtx(options) {
  options = options || { }
  return { 
    event: { 
      body: {
        statusid: options.statusid
      }
    },
    env: { },
    state: { 
      mongodb: options.mongodb
    },
    error: options.error || null,
    logger: new LoggerWrapper({ prettify })
  }
}
