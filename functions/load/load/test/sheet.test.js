require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { convertToPlainText } = require('../lib/convert')


// Supersheets Public View Test
const GOOGLESHEET_PUBLIC_VIEW_ID = '1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I'
// Supersheets Public View GoogleDoc Test
const GOOGLESHEET_ID = '1xyhRUvGTAbbOPFPNB-05Xn6rUT60wNUXJxtGY5RWzpU'
// Supersheets Public Doc Test
const GOOGLEDOC_URL = 'https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit'
// Supersheets Public Doc Test 2
const GOOGLEDOC2_URL = 'https://docs.google.com/document/d/1ej3jkUeP433331cMnt-LMXQ4HzC8Kk4Dw1UeL-UW8z8/edit'
// Supersheets Inaccessible Doc Test
const INACCESSIBLE_URL = 'https://docs.google.com/document/d/1rdezdce_i3Oj_vpERMA9BLsQcue1yD5jTcneS6LuzN8/edit'

const {
  loadSheet,
  fetchData,
  fetchSheetData,
  fetchDocsData,
  fetchDoc
} = require('../lib/sheet')


describe('loadSheet', () => {
  let token = null
  let ctx = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    ctx = createTestCtx({ token })
  })
  it ('should fetch a single sheet', async () => {
    ctx.state.metadata = createTestMetadata()
    let { sheet, docs } = await loadSheet(ctx, { title: "Passages" })
    expect(sheet).toMatchObject({
      title: "Passages",
      cols: [ "id", "writer", "passage" ],
      ncols: 3,
      nrows: 3
    })
    expect(docs.length).toEqual(3)
  })
  it ('should load a totally empty sheet', async () => {
    ctx.state.metadata = createTestMetadata()
    ctx.state.metadata.id = GOOGLESHEET_PUBLIC_VIEW_ID
    let { sheet, docs } = await loadSheet(ctx, { title: "Empty" })
    expect(sheet).toEqual({
      "title": "Empty",
      "cols": [],
      "schema": {
        "columns": [
          {
            "name": "_id",
            "datatype": "String",
            "sample": "5d6b2f2f0c6d3f00074ad599",
            "reserved": true
          },
          {
            "name": "_sheet",
            "datatype": "String",
            "sample": "Sheet1",
            "reserved": true
          },
          {
            "name": "_row",
            "datatype": "Int",
            "sample": 1,
            "reserved": true
          },
          {
            "name": "_errors",
            "datatype": "StringList",
            "sample": [],
            "reserved": true
          }
        ],
        "docs": {}
      },
      "ncols": 0,
      "nrows": 0
    })
    expect(docs).toEqual([])
  })
  it ('should load a sheet with columns but no data', async () => {
    ctx.state.metadata = createTestMetadata()
    ctx.state.metadata.id = GOOGLESHEET_PUBLIC_VIEW_ID
    let { sheet, docs } = await loadSheet(ctx, { title: "NoData" })
    expect(sheet).toMatchObject({
      title: "NoData",
      cols: [ "Col1", "Col2" ],
      schema: {
        columns: [
          {
            "name": "_id",
            "datatype": "String",
            "sample": "5d6b2f2f0c6d3f00074ad599",
            "reserved": true
          },
          {
            "name": "_sheet",
            "datatype": "String",
            "sample": "Sheet1",
            "reserved": true
          },
          {
            "name": "_row",
            "datatype": "Int",
            "sample": 1,
            "reserved": true
          },
          {
            "name": "_errors",
            "datatype": "StringList",
            "sample": [],
            "reserved": true
          },
          {
            "name": "Col1",
            "datatype": "String",
            "sample": null
          },
          {
            "name": "Col2",
            "datatype": "String",
            "sample": null
          }
        ],
        docs: { },
        excluded: [ ]
      },
      ncols: 2,
      nrows: 0
    })
    expect(docs).toEqual([])
  })
})

describe('fetchData', () => {
  let ctx = null
  let token = null
  let docsapi = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    ctx = createTestCtx({ token })
  })
  it ('should fetch sheets and docs data', async () => {
    let metadata = createTestMetadata()
    let sheet = { title: "Passages" }
    let { cols, docs } = await fetchData(ctx, metadata, sheet)
    expect(cols).toEqual([ "id", "writer", "passage" ])
    expect(docs.length).toBe(3)
    expect(docs[0]).toMatchObject({
      "id": 123,
      "writer": "danieljyoo@goalbookapp.com",
      "passage": {
        "_docid": "1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0",
        "_url": "https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit"
      }
    })
    expect(convertToPlainText(docs[0].passage.title)).toEqual(`The Gettysburg Address`)
    expect(convertToPlainText(docs[0].passage.body)).toEqual(`Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
  })
})

describe('fetchSheetData', () => {
  let token = null
  let docsapi = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    sheetsapi = axios.create({
      baseURL: process.env.GOOGLESHEETS_BASE_URL
    })
    sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  })
  it ('should fetch sheet data in formatted mode', async () => {
    let sheet = { title: "Passages" }
    let options = { mode: "FORMATTED" }
    let { cols, docs } = await fetchSheetData(sheetsapi, GOOGLESHEET_ID, sheet, options)
    expect(cols).toEqual([ "id", "writer", "passage" ])
    expect(docs.length).toBe(3)
    expect(docs[0]).toMatchObject({
      "id": "123",
      "writer": "danieljyoo@goalbookapp.com",
      "passage": "https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit"
    })
  })
  it ('should fetch sheet data in unformatted mode', async () => {
    let sheet = { title: "Passages" }
    let options = { mode: "UNFORMATTED" }
    let { cols, docs } = await fetchSheetData(sheetsapi, GOOGLESHEET_ID, sheet, options)
    expect(cols).toEqual([ "id", "writer", "passage" ])
    expect(docs.length).toBe(3)
    expect(docs[0]).toMatchObject({
      "id": 123,
      "writer": "danieljyoo@goalbookapp.com",
      "passage": "https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit"
    })
  })
})

describe('fetchDocsData', () => {
  let token = null
  let docsapi = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    docsapi = axios.create({
      baseURL: process.env.GOOGLEDOCS_BASE_URL
    })
    docsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  })
  it ('should fetch docs for cols and docs', async () => {
    let cols = [ "doc1", "doc2" ]
    let docs = [ 
      {
        "name": "hello",
        "doc1": GOOGLEDOC_URL,
        "doc2": GOOGLEDOC2_URL
      },
      {
        "name": "world",
        "doc1": GOOGLEDOC_URL,
        "doc2": GOOGLEDOC2_URL
      }
    ]
    await fetchDocsData(docsapi, cols, docs)
    expect(docs[0]).toMatchObject({
      "name": "hello",
      "doc1": {
        "_docid": "1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0",
        "_url": "https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit"
      },
      "doc2": {
        "_docid": "1ej3jkUeP433331cMnt-LMXQ4HzC8Kk4Dw1UeL-UW8z8",
        "_url": "https://docs.google.com/document/d/1ej3jkUeP433331cMnt-LMXQ4HzC8Kk4Dw1UeL-UW8z8/edit"
      }
    })
    expect(convertToPlainText(docs[0]["doc1"].title)).toEqual(`The Gettysburg Address`)
    expect(convertToPlainText(docs[0]["doc1"].body)).toEqual(`Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
    expect(convertToPlainText(docs[0]["doc2"].title)).toEqual(`Song of Solomon`)
    expect(convertToPlainText(docs[0]["doc2"].body)).toEqual(`The North Carolina Mutual life Insurance agent promised to fly from Mercy to the other side of Lake Superior at three o'clock.`)
  })
})

describe('fetchDoc', () => {
  let token = null
  let docsapi = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    docsapi = axios.create({
      baseURL: process.env.GOOGLEDOCS_BASE_URL
    })
    docsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  })
  it ('should fetch a doc and extract data', async () => {
    let data = await fetchDoc(docsapi, GOOGLEDOC_URL)
    expect(data).toMatchObject({
      "_docid": "1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0",
      "_url": "https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit"
    })
    expect(convertToPlainText(data.title)).toEqual('The Gettysburg Address')
    expect(convertToPlainText(data.body)).toEqual(`Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
  })
  it ('should throw if given invalid googel doc url', async () => {
    let error = null 
    try {
      await fetchDoc(docsapi, "https://bad.com/url/blah")
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Invalid Google Doc URL: https://bad.com/url/blah`)
  })
  it ('should throw if user does not have access to the doc', async () => {
    let error = null 
    try {
      await fetchDoc(docsapi, INACCESSIBLE_URL)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Request failed with status code 403`)
  })
})


describe('fetch bad sheets', () => {
  let token = null
  let sheetsapi = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
    sheetsapi = axios.create({
      baseURL: process.env.GOOGLESHEETS_BASE_URL
    })
    sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  })
  it ('should fetch a totally empty sheet', async () => {
    let sheet = { title: "Empty" }
    let options = { mode: "FORMATTED" }
    let { cols, docs } = await fetchSheetData(sheetsapi, GOOGLESHEET_PUBLIC_VIEW_ID, sheet, options)
    expect(cols).toEqual([])
    expect(docs).toEqual([])
  }, 30 * 1000)
  it ('should fetch a sheet with columns but no data', async () => {
    let sheet = { title: "NoData" }
    let options = { mode: "FORMATTED" }
    let { cols, docs } = await fetchSheetData(sheetsapi, GOOGLESHEET_PUBLIC_VIEW_ID, sheet, options)
    expect(cols).toEqual([ 'Col1', 'Col2' ])
    expect(docs).toEqual([])
  })
})

function createTestCtx({ token }) {
  let sheetsapi = axios.create({
    baseURL: process.env.GOOGLESHEETS_BASE_URL
  })
  sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  let docsapi = axios.create({
    baseURL: process.env.GOOGLEDOCS_BASE_URL
  })
  docsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return {
    state: { 
      sheetsapi,
      docsapi
    }
  }
}

function createTestMetadata() {
  return {
    id: GOOGLESHEET_ID,
    config: {
      datatypes: {
        "id": "Int",
        "writer": "String",
        "passage": "GoogleDoc"
      },
      mode: "UNFORMATTED"
    }
  }
}

// cols = [ "name", "doc" ]
// datatypes = {
//   "name": "String",
//   "doc": "GoogleDoc"
// }
// docs = [ {
//   "name": "owen",
//   "doc": "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing",
//   "_errors": [ ]
// }, {
//   "name": "maggie",
//   "doc": "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing",
//   "_errors": [ ]
// } ]