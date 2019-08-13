require('dotenv').config()
const { startStatus, errorStatus, getStatus, deleteStatus } = require('../lib/status')
const uuidV4 = require('uuid/v4')
const prettify = require('@funcmaticjs/pretty-logs')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')

describe('Status', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  let uuid = null
  let metadata = { 
    uuid: 'METADATA-UUID',
    id: 'GOOGLE-SPREADSHEET-ID',
    datauuid: 'DATA-UUID',
    sheets: [ {
        title: "questions"
      }, {
        title: "answers"
      } ]
  }
  let user = {
    userid: "danieljyoo",
    email: "danieljyoo@goalbookapp.com",
    org: "goalbookapp.com"
  }
  let new_datauuid = "NEW-DATA-UUID"
  beforeEach(async () => {
    uuid = uuidV4()
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
  })
  afterEach(async () => {
    await deleteStatus(db, { uuid })
    await client.close()
  })
  it ('should insert an initial load status', async () => {
    let stat = await startStatus(db, metadata, user, { uuid, datauuid: new_datauuid })
    expect(stat).toMatchObject({
      uuid: uuid,
      status: 'INIT',
      sheet_id: 'GOOGLE-SPREADSHEET-ID',
      sheet_uuid: 'METADATA-UUID',
      sheet_current_datauuid: 'DATA-UUID',
      sheet_new_datauuid: 'NEW-DATA-UUID',
      num_sheets_loaded: 0,
      num_sheets_total: 2,
      sheets_loaded: [],
      created_at: expect.anything(),
      created_by: 'danieljyoo',
      created_by_email: 'danieljyoo@goalbookapp.com',
      created_by_org: 'goalbookapp.com',
      updated_at: expect.anything(),
      updated_by: 'danieljyoo',
      updated_by_email: 'danieljyoo@goalbookapp.com',
      updated_by_org: 'goalbookapp.com',
      error: null,
    })
  })
  it ('should indicate the status failed', async () => {
    await startStatus(db, metadata, user, { uuid, datauuid: new_datauuid })
    await errorStatus(db, metadata, user, uuid, new Error("some error message"), 1000)
    let stat = await getStatus(db, { uuid })
    expect(stat).toMatchObject({
      status: 'FAILURE',
      completed_at: expect.anything(),
      duration: 1000,
      error: {
        errorMessage: "some error message"
      }
    })
  })
})