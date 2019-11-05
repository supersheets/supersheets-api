require('dotenv').config()
const path = require('path')
const fs = require("fs")
const testdocs = initTestDocs([ "testdoc.json"])
const { isGoogleDoc, extractData, isFieldName, isFieldNameValid  } = require('../lib/docs')

describe('isGoogleDoc', () => {
  it ('should match if any docid is found', async () => {
    let url = "https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit?usp=sharing"
    expect(isGoogleDoc(url)).toBeTruthy()
    expect(isGoogleDoc(url)).toEqual("1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E")
  })
})

describe('isFieldNameValid', () => {
  it ('should not accept just "$" null field name', async () => {
    let n = "$"
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should not accept without leading "$"', async () => {
    let n = "invalidName"
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should not accept invalid GraphQL field names', async () => {
    let n = '$_invalid'
    expect(isFieldNameValid(n)).toBe(false)
  })
  it ('should accept valid GraphQL field names', async () => {
    let n = '$validName'
    expect(isFieldNameValid(n)).toBeTruthy()
    n = '$valid_name'
    expect(isFieldNameValid(n)).toBeTruthy()
    n = '$V123'
    expect(isFieldNameValid(n)).toBeTruthy()
  })
})

describe('Extract', () => {
  let doc = null
  beforeEach(async () => {
    doc = testdocs["testdoc.json"]
  }) 
  // https://docs.google.com/document/d/1JGLoOUVoF5LA1f463b2MhwOUAKMDSnuPTuVR6yksS4E/edit
  it ('should extract keys and values from the doc', async () => {
    let values = extractData(doc)
    expect(values).toMatchObject({
      name: expect.anything(),
      type: expect.anything(),
      value: expect.anything(),
      "_doc": expect.anything()
    })
    expect(values['name'].length).toEqual(1)
    expect(values['name'][0]).toEqual({
      "startIndex": 204,
      "endIndex": 209,
      "paragraph": {
        "elements": [
          {
            "startIndex": 204,
            "endIndex": 209,
            "textRun": {
              "content": "body\n",
              "textStyle": {}
            }
          }
        ],
        "paragraphStyle": {
          "namedStyleType": "NORMAL_TEXT",
          "lineSpacing": 100,
          "direction": "LEFT_TO_RIGHT",
          "avoidWidowAndOrphan": false
        }
      }
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