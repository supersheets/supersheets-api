require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { convertToPlainText } = require('./util')

// Supersheets Inaccessible Doc Test
const INACCESSIBLE_URL = 'https://docs.google.com/document/d/1rdezdce_i3Oj_vpERMA9BLsQcue1yD5jTcneS6LuzN8/edit'
// 
const NONEXISTANT_URL = 'https://docs.google.com/document/d/1rdezdce_i3Oj_vpERMA9BLsQcue1yD5jTcneS6LuzN7/edit'

// Supersheets Public Doc Test v2
const GOOGLEDOC_URL_V2 = 'https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit'
// Supersheets Public Doc Test 2 v2
const GOOGLEDOC2_URL_V2 = 'https://docs.google.com/document/d/1LCvn6UXzgadxwf9v98JXsoyGYhRSNUdR1gooOp2D7MA/edit'

const {
  isGoogleDoc,
  isFieldNameValid,
  fetchDocsData,
  fetchDocsForColumns,
  fetchDoc
} = require('../lib/docs')


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
        "doc1": GOOGLEDOC_URL_V2,
        "doc2": GOOGLEDOC2_URL_V2
      },
      {
        "name": "world",
        "doc1": GOOGLEDOC_URL_V2,
        "doc2": GOOGLEDOC2_URL_V2
      }
    ]
    await fetchDocsForColumns(docsapi, cols, docs)
    expect(docs[0]).toMatchObject({
      "name": "hello",
      "doc1": {
        "_docid": "1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8",
        "_url": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
      },
      "doc2": {
        "_docid": "1LCvn6UXzgadxwf9v98JXsoyGYhRSNUdR1gooOp2D7MA",
        "_url": "https://docs.google.com/document/d/1LCvn6UXzgadxwf9v98JXsoyGYhRSNUdR1gooOp2D7MA/edit"
      }
    })
    expect(docs[0]["doc1"]["_title"]).toEqual("Supersheets Public Doc Test v2")
    expect(docs[0]["doc1"].title).toEqual(`The Gettysburg Address`)
    expect(docs[0]["doc1"].description).toEqual(`Four score and seven years ago our fathers brought forth on this continent ...`)
    expect(convertToPlainText(docs[0]["doc1"]["_content"])).toEqual(`The Gettysburg Address\nFour score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
    expect(convertToPlainText(docs[0]["doc1"]["_text"])).toEqual(`The Gettysburg Address\nFour score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
    expect(docs[0]["doc2"]["_title"]).toEqual("Supersheets Public Doc Test 2 v2")
    expect(docs[0]["doc2"].title).toEqual(`Song of Solomon`)
    expect(docs[0]["doc2"].description).toEqual(`The North Carolina Mutual Life Insurance agent promised to fly from Mercy to the other side of Lake Superior at three o'clock.`)
    expect(convertToPlainText(docs[0]["doc2"]["_content"])).toEqual(`Song of Solomon\nThe North Carolina Mutual Life Insurance agent promised to fly from Mercy to the other side of Lake Superior at three o'clock.`)
    expect(convertToPlainText(docs[0]["doc2"]["_text"])).toEqual(`Song of Solomon\nThe North Carolina Mutual Life Insurance agent promised to fly from Mercy to the other side of Lake Superior at three o'clock.`)
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
    let data = await fetchDoc(docsapi, GOOGLEDOC_URL_V2)
    expect(data).toMatchObject({
      "_docid": "1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8",
      "_url": "https://docs.google.com/document/d/1IiMw4_wSJgi2eNocigsUzBoAg6dTTVSRgTr2TI9FnD8/edit"
    })
    expect(data.title).toEqual('The Gettysburg Address')
    expect(data.description).toEqual(`Four score and seven years ago our fathers brought forth on this continent ...`)
    expect(convertToPlainText(data["_content"])).toEqual(`The Gettysburg Address\nFour score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.`)
  }, 30 * 1000)
  it ('should throw if given invalid google doc url', async () => {
    let error = null 
    try {
      await fetchDoc(docsapi, "https://bad.com/url/blah")
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`Invalid Google Doc URL: https://bad.com/url/blah`)
  }, 30 * 1000)
  it ('should throw if user does not have access to the doc', async () => {
    let error = null 
    try {
      await fetchDoc(docsapi, INACCESSIBLE_URL)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`403 PERMISSION_DENIED: The caller does not have permission`)
  }, 30 * 1000)
  it ('should throw if the doc id does not actually exists', async () => {
    let error = null 
    try {
      await fetchDoc(docsapi, NONEXISTANT_URL)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`404 NOT_FOUND: Requested entity was not found.`)
  }, 30 * 1000)
})


describe('isGoogleDoc', () => {
  it ('should match if any docid is found', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    expect(isGoogleDoc(url)).toBeTruthy()
    expect(isGoogleDoc(url)).toEqual("1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E")
  })
})

describe('isFieldNameValid', () => {
  it ('should not accept just "" null field name', async () => {
    let n = ""
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should not accept invalid GraphQL field names', async () => {
    let n = 'in.valid'
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should not accept with leading _ names', async () => {
    let n = '_invalid'
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should accept valid GraphQL field names', async () => {
    let n = 'validName'
    expect(isFieldNameValid(n)).toBeTruthy()
    n = 'valid_name'
    expect(isFieldNameValid(n)).toBeTruthy()
    n = 'V123'
    expect(isFieldNameValid(n)).toBeTruthy()
  })
})

