require('dotenv').config()
const axios = require('axios')
const path = require('path')
const fs = require("fs")
const testdocs = initTestDocs([ "testdoc.json"])
const { isGoogleDoc, fetchDoc, extract, fetchAndExtract, convertValues, createGoogleDocSchemas } = require('../lib/doc')
const awsParamStore = require('aws-param-store')

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

describe('Doc Schema', () => {
  it ('should create a schema for a single google doc column', async () => {
    let docs = [ { 
      "passage": {
        hello: "world",
        foo: "bar"
      }
    } ]
    let datatypes = { 
      "passage": "GoogleDoc"
    } 
    let schema = createGoogleDocSchemas(docs, datatypes)
    expect(schema).toMatchObject({
      passage: {
        name: "passage",
        columns: [
          {
            "name": "passage.hello",
            "datatype": "String",
            "sample": "world"
          },
          {
            "name": "passage.foo",
            "datatype": "String",
            "sample": "bar"
          }
        ]
      }
    })
  })
  it ('should create a schema for a multiple google doc columns', async () => {
    let docs = [ { 
      "passage": {
        hello: "world",
        foo: "bar"
      },
      "author": {
        first: "daniel",
        last: "yoo"
      }
    } ]
    let datatypes = { 
      "passage": "GoogleDoc",
      "author": "GoogleDoc"
    } 
    let schema = createGoogleDocSchemas(docs, datatypes)
    expect(schema['passage']).toMatchObject({
      "name": "passage",
      "columns": [
        {
          "name": "passage.hello",
          "datatype": "String",
          "sample": "world"
        },
        {
          "name": "passage.foo",
          "datatype": "String",
          "sample": "bar"
        }
      ]
    })
    expect(schema['author']).toMatchObject({
      "name": "author",
      "columns": [
        {
          "name": "author.first",
          "datatype": "String",
          "sample": "daniel"
        },
        {
          "name": "author.last",
          "datatype": "String",
          "sample": "yoo"
        }
      ]
    })
  })
  it ('should set all falsy sample values as null', async () => {
    let docs = [ 
      { 
        "passage": {
          hello: "",
          foo: null
        }
      }
    ]
    let datatypes = { 
      "passage": "GoogleDoc"
    } 
    let schema = createGoogleDocSchemas(docs, datatypes)
    expect(schema.passage.columns[0]).toMatchObject({
      "name": "passage.hello",
      "datatype": "String",
      "sample": null
    })
    expect(schema.passage.columns[1]).toMatchObject({
      "name": "passage.foo",
      "datatype": "String",
      "sample": null
    })
  })
  it ('should find a non null sample if it exists', async () => {
    let docs = [ 
      { 
        "passage": {
          hello: "",
          foo: null
        }
      }, 
      {
        "passage": {
          hello: "world",
          foo: "bar"
        }
      }
    ]
    let datatypes = { 
      "passage": "GoogleDoc"
    } 
    let schema = createGoogleDocSchemas(docs, datatypes)
    expect(schema.passage.columns[0]).toMatchObject({
      "name": "passage.hello",
      "datatype": "String",
      "sample": "world"
    })
    expect(schema.passage.columns[1]).toMatchObject({
      "name": "passage.foo",
      "datatype": "String",
      "sample": "bar"
    })
    docs = [ 
      {
        "passage": {
          hello: "world",
          foo: "bar"
        }
      },
      { 
        "passage": {
          hello: null,
          foo: ""
        }
      }
    ]
    schema = createGoogleDocSchemas(docs, datatypes)
    expect(schema.passage.columns[0]).toMatchObject({
      "name": "passage.hello",
      "datatype": "String",
      "sample": "world"
    })
    expect(schema.passage.columns[1]).toMatchObject({
      "name": "passage.foo",
      "datatype": "String",
      "sample": "bar"
    })
  })
})

describe('fetchDoc', () => {
  let token = null
  let options = { }
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  })
  beforeEach(async () => {
    options = {
      //axios: mockaxios(testdocs["testdoc.json"]),
      axios: axios.create({
        baseURL: process.env.GOOGLEDOCS_BASE_URL
      }),
      idptoken: token
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