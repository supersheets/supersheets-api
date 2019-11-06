require('dotenv').config()
const path = require('path')
const fs = require("fs")
const testdocs = initTestDocs([ "testdoc.json"])
const { isGoogleDoc, extractData, isFieldNameValid  } = require('../lib/docs')

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
