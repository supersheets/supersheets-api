require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { convertToPlainText } = require('../lib/convert')

// Supersheets Public Doc Test
const GOOGLEDOC_URL = 'https://docs.google.com/document/d/1wtTsHj_03WayP7uX0Xs0VXxdc7Torfh80ahYeMUTLe0/edit'
// Supersheets Public Doc Test 2
const GOOGLEDOC2_URL = 'https://docs.google.com/document/d/1ej3jkUeP433331cMnt-LMXQ4HzC8Kk4Dw1UeL-UW8z8/edit'
// Supersheets Inaccessible Doc Test
const INACCESSIBLE_URL = 'https://docs.google.com/document/d/1rdezdce_i3Oj_vpERMA9BLsQcue1yD5jTcneS6LuzN8/edit'

const {
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
        "doc1": GOOGLEDOC_URL,
        "doc2": GOOGLEDOC2_URL
      },
      {
        "name": "world",
        "doc1": GOOGLEDOC_URL,
        "doc2": GOOGLEDOC2_URL
      }
    ]
    await fetchDocsForColumns(docsapi, cols, docs)
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
