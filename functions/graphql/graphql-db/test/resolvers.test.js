require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"
const fs = require('fs')
const path = require('path')
const { gql } = require('apollo-server-lambda')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const { createResolvers } = require('../lib/schema')
const NOOP = async () => { }
const SCHEMA_TEST_FILE = 'typedefs_dateformat.gql'

describe('createResolvers', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
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
    //await createTestMetadata(db)
  })
  afterEach(async () => {
    //await deleteTestMetadata(db)
  })
  it ('should create resolver map', async () => {
    let typeDefs = gql(fs.readFileSync(path.join(__dirname, SCHEMA_TEST_FILE)).toString('utf8'))
    let map = createResolvers({ typeDefs })
    expect(map).toMatchObject({
      'Query': {
        find: expect.anything(),
        findOne: expect.anything()
      },
      'RowConnection': {
        edges: expect.anything(),
        totalCount: expect.anything(),
        pageInfo: expect.anything()
      },
      'Date': expect.anything()
    })
  }, 30 * 1000)
})
