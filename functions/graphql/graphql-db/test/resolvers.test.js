require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const fs = require('fs')
const path = require('path')
const { generate, generateGraphQLNames } = require('../lib/schema')
const { 
  createResolvers,
  createSheetQueryResolvers,
  createSheetConnectionResolvers,
  createSheetFieldResolvers,
  createDateFormatResolver,
  createDatetimeFormatResolver,
  createRelationshipResolver
} = require('../lib/resolvers')
const { createLoader } = require('../lib/dataloader')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')

const NOOP = async () => { }

describe('createResolvers', () => {
  it ('should create resolver map', async () => {
    //let typeDefs = gql(fs.readFileSync(path.join(__dirname, SCHEMA_TEST_FILE)).toString('utf8'))
    let typeDefs = getTestSchema()
    let metadata = getTestMetadata()
    let map = createResolvers({ typeDefs, metadata })
    expect(map).toEqual({
      'Query': {
        findPosts: expect.anything(),
        findOnePosts: expect.anything()
      },
      'Posts': {
        "date": expect.anything(),
        "datetime": expect.anything(),
        "image": expect.anything(),
        "posts": expect.anything()
      },
      'PostsConnection': {
        rows: expect.anything(),
        totalCount: expect.anything(),
        pageInfo: expect.anything()
      },
      'PostsGoogledocDoc': {
        "excerpt": expect.anything(),
        "html": expect.anything(),
        "markdown": expect.anything(),
        "text": expect.anything()
      },
      'Image': {
        src: expect.anything(),
        blurup: expect.anything()
      },
      'Date': expect.anything(),
      'Datetime': expect.anything()
    })
  }, 30 * 1000)
})

describe('createSheetQueryResolvers', () => {
  it ('should generate resolvers for top-level Row type', async () => {
    let sheet = { title: "Rows" }
    let names = { 'find': 'find', 'findOne': 'findOne' }
    let { Query } = createSheetQueryResolvers(sheet, { names })
    expect(Query).toMatchObject({
      find: expect.anything(),
      findOne: expect.anything()
    })
    let { query, options } = await Query.find({ }, { }, { logger: console }, { })
    expect(query).toEqual({ })
  })
  it ('should generate resolvers for a sheet type', async () => {
    let sheet = { title: "Posts" }
    let names = { 'find': 'findPosts', 'findOne': 'findOnePost' }
    let { Query } = createSheetQueryResolvers(sheet, { names })
    expect(Query).toMatchObject({
      findPosts: expect.anything(),
      findOnePost: expect.anything()
    })
    let { query, options } = await Query.findPosts({ }, { }, { logger: console }, { })
    expect(query).toMatchObject({
      "_sheet": "Posts"
    })
  })
})

describe('createSheetConnectionResolvers', () => {
  it ('should create a connection resolver based on sheet name', async () => {
    let names = { 'connection': 'RowConnection' }
    let resolvers = createSheetConnectionResolvers({ }, { names })
    expect(resolvers).toMatchObject({
      'RowConnection': {
        rows: expect.anything(),
        totalCount: expect.anything(),
        pageInfo: expect.anything()
      }
    })
  })
})

describe('createSheetFieldResolvers', () => {
  it ('should create date and datetime field resolvers for top-level Row type', async () => {
    let metadata = getTestMetadata()
    let sheet = { title: "Rows", schema: metadata.schema }
    let names = generateGraphQLNames(sheet)
    let resolvers = createSheetFieldResolvers(sheet, { names })
    expect(resolvers).toMatchObject({
      "Rows": {
        "date": expect.anything(),
        "datetime": expect.anything(),
      }
    })
  })
  it ('should create date and datetime field resolvers for sheet type', async () => {
    let sheet = { 
      title: "Posts", 
      schema: {
        columns: [ 
          { name: "published", datatype: "Date" },
          { name: "published_at", datatype: "Datetime" },
          { name: "shouldNotAppear", datetype: "String" }
        ]
      }
    }
    let names = generateGraphQLNames(sheet)
    let resolvers = createSheetFieldResolvers(sheet, { names })
    expect(resolvers).toEqual({
      "Posts": {
        "published": expect.anything(),
        "published_at": expect.anything()
      }
    })
  })
  it ('should create image field resolvers for top-level Row type', async () => {
    let metadata = getTestMetadata()
    let sheet = { title: "Rows", schema: metadata.schema }
    let names = generateGraphQLNames(sheet)
    let resolvers = createSheetFieldResolvers(sheet, { names })
    expect(resolvers).toMatchObject({
      "Rows": {
        "image": expect.anything()
      }
    })
  })
})

describe('Date Resolver', () => {
  let dateResolver = createDateFormatResolver()
  it ('should return a UTC date ISO formatted by default', async () => {
    let d = new Date()
    let parent = { "date": d }
    let args = { }
    let path = { key: "date" }
    let resolved = await dateResolver(parent, args, { }, { path })
    expect(resolved).toEqual(d.toISOString().split("T")[0])
  })
})

describe('Datetime Resolver', () => {
  let datetimeResolver = createDatetimeFormatResolver()
  it ('should return a UTC date ISO formatted by default', async () => {
    let d = new Date()
    let parent = { "datetime": d }
    let args = { }
    let path = { key: "datetime" }
    let resolved = await datetimeResolver(parent, args, { }, { path })
    expect(resolved).toEqual(d.toISOString())
  })
})

describe('createRelationshipResolver', () => {
  
  let loader = null
  let plugin = new MongoDBPlugin()
  let client = null
  let db = null
  beforeAll(async () => {
    client = await plugin.createClient(process.env.FUNC_MONGODB_URI)
    db = client.db()
    await initTestData(db, 'TEST-LOADER-COLLECTION')
    loader = createLoader(db.collection('TEST-LOADER-COLLECTION'), { logger: console })
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
  it ('should resolve using a loader', async () => {
    let relationship = { sheet: "Authors", field: "email", operator: "eq" }
    let resolver = createRelationshipResolver(relationship)
    let parent = { _sheet: "Posts", authors: "danieljyoo@gmail.com" }
    let key = "authors"
    let res = await resolver(parent, { }, { loader, logger: console }, { path: { key } })
    expect(res).toEqual([ { 
      _id: expect.anything(),
      _sheet: 'Authors',
      email: 'danieljyoo@gmail.com',
      name: 'Daniel Jhin Yoo' } 
    ])
  })
})

function getTestSchema() {
  return generate(getTestMetadata())
}

function getTestMetadata() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'metadata.json')).toString('utf8'))
}

async function initTestData(db, collection) {
  collection = collection || TEST_COLLECTION
  await db.collection(collection).insertMany([ 
    { _sheet: "Posts", authors: "danieljyoo@gmail.com" }, // { "_sheet": "Authors", "field": "email", "op": "eq", "value": "danieljyoo@gmail.com" },
    { _sheet: "Posts", authors: "danieljyoo@goalbookapp.com" }, // { "_sheet": "Authors", "field": "email", "op": "eq", "value": "danieljyoo@goalbookapp.com" },
    { _sheet: "Authors", email: "danieljyoo@gmail.com", name: "Daniel Jhin Yoo" },
    { _sheet: "Authors", email: "danieljyoo@goalbookapp.com", name: "Daniel Yoo" }
  ])
}

async function deleteTestData(db, collection) {
  collection = collection || TEST_COLLECTION
  await db.collection(collection).drop()
}

