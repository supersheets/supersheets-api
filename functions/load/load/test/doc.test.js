require('dotenv').config()
const path = require('path')
const fs = require("fs")
const testdocs = initTestDocs([ "testdoc.json"])
const { isGoogleDoc, extractData  } = require('../lib/docutil')

describe('isGoogleDoc', () => {
  it ('should match if any docid is found', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    expect(isGoogleDoc(url)).toBeTruthy()
    expect(isGoogleDoc(url)).toEqual("1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E")
  })
})

describe('Extract', () => {
  let doc = null
  beforeEach(async () => {
    doc = testdocs["testdoc.json"]
  }) 
  it ('should extract keys and values from the doc', async () => {
    let values = extractData(doc)
    expect(values).toMatchObject({
      name: "body",
      type: "string",
      value: expect.anything()
    })
  })
})

function initTestDocs(filenames) {
  let docs = { }
  for (let name of filenames) {
    docs[name] = JSON.parse(fs.readFileSync(path.join(__dirname, name)))
  }
  return docs
}