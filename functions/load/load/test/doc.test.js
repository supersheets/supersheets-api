require('dotenv').config()
const axios = require('axios')
const path = require('path')
const fs = require("fs")
const testdocs = initTestDocs([ "testdoc.json"])
const { isGoogleDoc, fetchDoc, extract, fetchAndExtract, convertValues } = require('../lib/doc')


describe('convertValues', () => {
  let cols = null
  let datatypes = null
  let docs = null
  let options = null
  beforeEach(async () => {
    cols = [ "name", "doc" ]
    datatypes = {
      "name": "String",
      "doc": "GoogleDoc"
    }
    docs = [ {
      "name": "owen",
      "doc": "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing",
      "_errors": [ ]
    }, {
      "name": "maggie",
      "doc": "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing",
      "_errors": [ ]
    } ]
    options = {
      axios: mockaxios(testdocs["testdoc.json"])
    }
  })
  it ('should convert', async () => {
    await convertValues(cols, docs, datatypes, options)
    expect(docs[0].doc).toMatchObject({
      name: "body",
      type: "string",
      value: expect.anything()
    })
  })
})

describe('isGoogleDoc', () => {
  it ('should match if any docid is found', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    expect(isGoogleDoc(url)).toBeTruthy()
    expect(isGoogleDoc(url)).toEqual("1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E")
  })
})

describe('fetchDoc', () => {
  let options = { }
  beforeEach(async () => {
    options = {
      //axios: mockaxios(testdocs["testdoc.json"]),
      axios: axios.create({
        baseURL: process.env.GOOGLEDOCS_BASE_URL,
        params: {
          key: process.env.GOOGLESHEETS_API_KEY
        }
      }),
      idptoken: process.env.GOOGLE_OAUTHTOKEN
    }
  })
  it ('should fetch a Google Doc', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    let doc = await fetchDoc(url, options)
    expect(doc).toMatchObject({
      documentId: '1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E'
    })
  })
  it ('should fetch and extract a Google Doc', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    let values = await fetchAndExtract(url, options)
    expect(values).toMatchObject({
      name: 'body',
      type: 'string',
      value: expect.stringMatching(/^Four score and seven years ago/)
    })
  })
})


describe('Extract', () => {
  let doc = null
  beforeEach(async () => {
    doc = testdocs["testdoc.json"]
  }) 
  it ('should extract keys and values from the doc', async () => {
    let values = extract(doc)
    expect(values).toMatchObject({
      name: "body",
      type: "string",
      value: expect.anything()
    })
  })
})


function mockaxios(response, error) {
  return {
    get: async () => {
      if (response) return { data: response }
      if (error) throw error
    }
  }
}

function initTestDocs(filenames) {
  let docs = { }
  for (let name of filenames) {
    docs[name] = JSON.parse(fs.readFileSync(path.join(__dirname, name)))
  }
  return docs
}