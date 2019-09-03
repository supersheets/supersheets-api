require('dotenv').config()
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const MongoDBPlugin = require('@funcmaticjs/mongodb-plugin')
const prettify = require('@funcmaticjs/pretty-logs')

// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const SPREADSHEETID = "1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI"

describe('Error Handling', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it("should return 404 Not Found if the id is invalid", async () => {
    let ctx = createCtx()
    ctx.event.pathParameters.spreadsheetid = 'BAD-SPREADSHEET-ID'
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 404
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Could not find metadata with id BAD-SPREADSHEET-ID`
    })
  })
  it("should return 500 Internal Server error if mongodb error", async () => {
    let ctx = createCtx()
    ctx.state = {
      mongodb: mockdb(async () => {
        throw new Error("some Mongodb error")
      })
    }
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 500
    })
    let body = JSON.parse(ctx.response.body)
    expect(body).toMatchObject({
      errorMessage: `Error looking up metadata for ${SPREADSHEETID}`
    })
  })
})

describe('Function', () => {
  let func = null
  beforeEach(async () => {
    func = require('../index.js').func
    func.logger.logger.prettify = prettify
  })
  afterEach(async () => {
    await func.invokeTeardown()
  })
  it("should return the metadata for a spreadsheet", async () => {
    let ctx = createCtx()
    ctx.state.mongodb = mockdb(async () => {
      return getTestMetadata()
    })
    await func.invoke(ctx)
    expect(ctx.response).toMatchObject({
      statusCode: 200
    })
    let body = JSON.parse(ctx.response.body)
    console.log("Schema", body.schema)
  })
})

function createCtx() {
  return {
    event: {
      httpMethod: 'GET',
      pathParameters: {
        spreadsheetid: SPREADSHEETID
      },
      headers: {
        'Content-Type': 'application/json',
      },
    },
    env: {
      FUNC_MONGODB_URI: process.env.FUNC_MONGODB_URI
    },
    state: {}
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

function getTestMetadata() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'metadata.json')))
}