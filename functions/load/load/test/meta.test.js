require('dotenv').config()
const uuidV4 = require('uuid/v4')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { LoggerWrapper } = require('@funcmaticjs/funcmatic')
const prettify = require('@funcmaticjs/pretty-logs')
const awsParamStore = require('aws-param-store')
const axios = require('axios')

// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const GOOGLESPREADSHEET_ID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"

//const GOOGLESPREADSHEET_PRIVATE_ID = "1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY"
// Goalbook Private Supersheets Cross Domain Test
// Added service account email with edit access to this sheet
// https://docs.google.com/spreadsheets/d/1UWbjiyx0gL9tsbsKoYUeeCoiwdefNyka4Rn00NFX-pM/edit#gid=0
const GOOGLESPREADSHEET_PRIVATE_ID = "1UWbjiyx0gL9tsbsKoYUeeCoiwdefNyka4Rn00NFX-pM"

const { 
  findStatus,
  updateStatus,
  deleteStatus
} = require('../lib/status')

const {
  metaHandler,
  initOrFindMetadata,
  fetchAndMergeMetadata,
  createOrUpdateMetadata,
  findMetadata,
  saveMetadata,
  deleteMetadata
} = require('../lib/meta')

const NOOP = async () => { }


describe('metaHandler', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let meta = null
  let status = null
  let sheetsapi = null 
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    sheetsapi = await createSheetsApi()
  })
  afterAll(async () => {
    if (client) {
      await client.close()
    }
    client = null
    db = null
  })
  beforeEach(async () => {

  })
  afterEach(async () => {
    await deleteStatus(db, { sheet_id: GOOGLESPREADSHEET_ID})
    await deleteMetadata(db, GOOGLESPREADSHEET_ID)
  })
  it ('should load a new spreadsheet metadata', async () => {
    let ctx = createTestCtx({ mongodb: db })
    ctx.state.sheetsapi = sheetsapi
    await metaHandler(ctx, NOOP)
    let metadata = await findMetadata(db, GOOGLESPREADSHEET_ID)
    expect(metadata["_new"]).toBe(undefined)
    expect(metadata).toMatchObject({
      nrows: 0,
      ncols: 0
    })
    expect(metadata.schema).toEqual({
      "columns": [],
      "docs": {}
    })
  })
  it ('should reload a spreadsheet metadata', async () => {
    await createTestMetadata(db)
    let ctx = createTestCtx({ mongodb: db })
    ctx.state.sheetsapi = sheetsapi
    await metaHandler(ctx, NOOP)
    let saved = await findMetadata(db, GOOGLESPREADSHEET_ID)
    expect(saved).toMatchObject({
      nrows: 0,
      ncols: 0
    })
    expect(saved.schema).toEqual({
      "columns": [],
      "docs": {}
    })
  })
})

describe('initOrFindMeta', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let meta = null
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
    meta = await createTestMetadata(db)
    status = await createTestStatus(db)
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid: status.uuid })
    await deleteMetadata(db, meta.id)
    status = null
  })
  it ('should throw if spreadsheetid not in the body', async () => {
    let ctx = createTestCtx({
      mongodb: db
    })
    ctx.event.body.spreadsheetid = null
    let error = null
    try {
      await initOrFindMetadata(ctx)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual("No Google Spreadsheet Doc ID provided ('ctx.event.body.spreadsheetid')")
  })
  it ('should throw if user does not belong to org', async () => {
    let ctx = createTestCtx({
      mongodb: db,
      user: { email: "user@someother.org", org: "someother.org" }
    })
    let error = null
    try {
      await initOrFindMetadata(ctx)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Unauthorized: user@someother.org not does not belong to org funcmatic.com`)
  })
  it ('should find and set existing metadata', async () => {
    let ctx = createTestCtx({
      spreadsheetid: meta.id,
      mongodb: db
    })
    await initOrFindMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      id: meta.id
    })
  })
  it ('should initialize an empty metadata', async () => {
    let ctx = createTestCtx({
      spreadsheetid: 'new-spreadsheet-id',
      mongodb: db
    })
    await initOrFindMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      "id": 'new-spreadsheet-id',
      "_new": true
    })
  })
})

describe('fetchAndMergeMetadata', () => {
  let sheetsapi = null
  beforeAll(async () => {
    sheetsapi = await createSheetsApi()
  })
  afterAll(async () => {
  })
  it ('should fetch and merge metadata from a public sheet', async () => {
    let ctx = createTestCtx({
      spreadsheetid: GOOGLESPREADSHEET_ID
    })
    ctx.state.metadata = { "_new": true }
    ctx.state.sheetsapi = sheetsapi
    await fetchAndMergeMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      "_new": true,
      id: GOOGLESPREADSHEET_ID,
      title: 'Supersheets Public GraphQL Test'
    })
  })
  it ('should fetch and merge metadata from a private sheet', async () => {
    let ctx = createTestCtx({
      spreadsheetid: GOOGLESPREADSHEET_PRIVATE_ID
    })
    ctx.state.metadata = { "_new": true }
    ctx.state.sheetsapi = sheetsapi
    await fetchAndMergeMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      "_new": true,
      id: GOOGLESPREADSHEET_PRIVATE_ID,
      title: 'Goalbook Private Supersheets Cross Domain Test'
    })
  })
})

describe('createOrUpdateMeta', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let meta = null
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
    meta = await createTestMetadata(db)
    status = await createTestStatus(db)
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid: status.uuid })
    await deleteMetadata(db, meta.id)
    status = null
  })
  // it ('should throw if spreadsheetid not in the body', async () => {
  //   let ctx = createTestCtx({
  //     mongodb: db
  //   })
  //   ctx.event.body.spreadsheetid = null
  //   let error = null
  //   try {
  //     await initOrFindMetadata(ctx)
  //   } catch (err) {
  //     error = err
  //   }
  //   expect(error).toBeTruthy()
  //   expect(error.message).toEqual("No Google Spreadsheet Doc ID provided ('ctx.event.body.spreadsheetid')")
  // })
  // TODO: need to test create vs update
  // also test backward compat if no created_at fields when doing an update
  // also ensure that if existing db in database it is overwritten by this
  it ('should save new metadata with created and updated fields', async () => {
    let ctx = createTestCtx({
      mongodb: db
    })
    ctx.state.metadata = {
      id: meta.id,
      "_new": true
    }
    await createOrUpdateMetadata(ctx)
    expect(ctx.state.metadata).toEqual({
      "_id": expect.anything(),
      id: meta.id,
      created_at: expect.anything(),
      created_by: ctx.state.user.userid,
      created_by_email: ctx.state.user.email,
      created_by_org: ctx.state.user.org,
      updated_at: expect.anything(),
      updated_by: ctx.state.user.userid,
      updated_by_email: ctx.state.user.email,
      updated_by_org: ctx.state.user.org
    })
  })
  it ('should update metadata with update fields', async () => {
    let ctx = createTestCtx({
      mongodb: db
    })
    ctx.state.metadata = {
      id: meta.id,
      created_at: new Date(),
      created_by: "creatorid"
    }
    await createOrUpdateMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      "_id": expect.anything(),
      id: meta.id,
      created_at: expect.anything(),
      created_by: "creatorid",
      updated_at: expect.anything(),
      updated_by: ctx.state.user.userid,
      updated_by_email: ctx.state.user.email,
      updated_by_org: ctx.state.user.org
    })
  })
  it ('should include created fields on update if they do not exist', async () => {
    let ctx = createTestCtx({
      mongodb: db
    })
    ctx.state.metadata = {
      id: meta.id
    }
    await createOrUpdateMetadata(ctx)
    expect(ctx.state.metadata).toMatchObject({
      created_at: expect.anything(),
      created_by: ctx.state.user.userid,
      created_by_email: ctx.state.user.email,
      created_by_org: ctx.state.user.org
    })
  })
})

function createTestUser() {
  return {
    userid: "1234",
    email: "danieljyoo@funcmatic.com",
    org: "funcmatic.com"
  }
}

async function createSheetsApi() {
  let token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  let sheetsapi = axios.create({
    baseURL: process.env.GOOGLESHEETS_BASE_URL
  })
  sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return sheetsapi
}

async function createTestMetadata(db, options) {
  options = options || { }
  let user = options.user || createTestUser()
  let metadata = {
    id: options.id || GOOGLESPREADSHEET_ID,
    created_by_org: user.org
  }
  await saveMetadata(db, metadata)
  return findMetadata(db, metadata.id)
}


async function createTestStatus(db, options) {
  options = options || { }
  let user = options.user || createTestUser()
  let status = {
    uuid: options.uuid || uuidV4(),
    status: options.status || "INIT"
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
  let user = options.user || createTestUser()
  return { 
    event: { 
      body: {
        spreadsheetid: options.spreadsheetid || GOOGLESPREADSHEET_ID
      }
    },
    env: { },
    state: { 
      mongodb: options.mongodb,
      user
    },
    error: options.error || null,
    logger: new LoggerWrapper({ prettify })
  }
}
