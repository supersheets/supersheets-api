require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { convertToPlainText } = require('../lib/convert')


// Supersheets Public View Test
const GOOGLESHEET_PUBLIC_VIEW_ID = '1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I'
// Supersheets Public View GoogleDoc Test
const GOOGLESHEET_ID = '1xyhRUvGTAbbOPFPNB-05Xn6rUT60wNUXJxtGY5RWzpU'

const {
  loadSheet,
  fetchData,
  fetchSheetData
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
        "_docid": "1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8",
        "_url": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
      }
    })
    expect(docs[0].passage.title).toEqual(`The Gettysburg Address`)
    expect(docs[0].passage.description).toEqual(`Four score and seven years ago our fathers brought forth on this continent ...`)
    expect(convertToPlainText(docs[0].passage["_content"])).toEqual(`The Gettysburg Address\nFour score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
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
      "passage": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
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
      "passage": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
    })
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