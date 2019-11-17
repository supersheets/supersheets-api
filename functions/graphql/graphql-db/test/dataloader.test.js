require('dotenv').config()

const { createBatchQueryFn, createLoader } = require('../lib/dataloader')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const TEST_COLLECTION = 'TEST-COLLECTION'

describe('createBatchQueryFn', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await initTestData(db)
  }, 10 * 1000)
  afterAll(async () => {
    if (client) {
      await deleteTestData(db)
      await client.close()
      await plugin.teardown()
    }
    client = null
    db = null
  }, 10 * 1000)
  it ('should connect to mongodb', async () => {
    let fn = createBatchQueryFn()
    let queries = [ 
      { _sheet: "Sheet1", id: "a" },
      { _sheet: "Sheet1", id: "b" }
    ]
    let data = await fn(db.collection(TEST_COLLECTION), queries)
    expect(data).toEqual([
      [
        {
          "_id": expect.anything(),
          "_sheet": "Sheet1",
          "id": "a",
          "value": 1
        }
      ],
      [
        {
          "_id": expect.anything(),
          "_sheet": "Sheet1",
          "id": "b",
          "value": 2
        }
      ]
    ])
  }, 30 * 1000)
})

describe('createLoader', () => {
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await initTestData(db, 'TEST-LOADER-COLLECTION')
  }, 10 * 1000)
  afterAll(async () => {
    if (client) {
      await deleteTestData(db, 'TEST-LOADER-COLLECTION')
      await client.close()
      await plugin.teardown()
    }
    client = null
    db = null
  }, 10 * 1000)
  it ('should create a loader', async () => {
    let loader = createLoader(db.collection('TEST-LOADER-COLLECTION'))
    let queries = [ 
      { _sheet: "Sheet1", id: "a" },
      { _sheet: "Sheet1", id: "b" }
    ]
    let loads = [ ]
    for (let query of queries) {
      loads.push(loader.load(query))
    }
    let data = await Promise.all(loads)
    expect(data).toEqual([
      [
        {
          "_id": expect.anything(),
          "_sheet": "Sheet1",
          "id": "a",
          "value": 1
        }
      ],
      [
        {
          "_id": expect.anything(),
          "_sheet": "Sheet1",
          "id": "b",
          "value": 2
        }
      ]
    ])
  }, 30 * 1000)
})

async function initTestData(db, collection) {
  collection = collection || TEST_COLLECTION
  await db.collection(collection).insertMany([ 
    { _sheet: "Sheet1", id: "a", value: 1 },
    { _sheet: "Sheet1", id: "b", value: 2 },
    { _sheet: "Sheet1", id: "c", value: 3 },
    { _sheet: "Sheet2", id: "d", value: 4 }
  ])
}

async function deleteTestData(db, collection) {
  collection = collection || TEST_COLLECTION
  await db.collection(collection).drop()
}

