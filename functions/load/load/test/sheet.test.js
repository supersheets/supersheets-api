require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')

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
    let sheet = { title: "Passages" }
    let { cols, docs, schema } = await loadSheet(ctx, sheet)
    console.log(JSON.stringify({ cols, docs, schema}, null, 2))
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
        "title": `The Gettysburg Address`,
        "body": `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`
      }
    })
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
        title: `The Gettysburg Address`,
        body: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`
      },
      "doc2": {
        title: `Song of Solomon`,
        body: `The North Carolina Mutual life Insurance agent promised to fly from Mercy to the other side of Lake Superior at three o'clock.`
      }
    })
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
    expect(data).toEqual({
      title: 'The Gettysburg Address',
      body: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.'
    })
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