require('dotenv').config()
const axios = require('axios')
const { fetchSheetData } = require('../lib/load')
const awsParamStore = require('aws-param-store')

// Supersheets Public View Test
const GOOGLESPREADSHEET_ID = "1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I"
// Supersheets Private View Test
const GOOGLESPREADSHEET_PRIVATE_ID = "1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY"

describe('Fetch Google Sheet Formatting', () => {
  beforeEach(async () => {
    axios.defaults.baseURL = process.env.GOOGLESHEETS_BASE_URL
    axios.defaults.params = { }
    axios.defaults.params['key'] = process.env.GOOGLESHEETS_API_KEY
  })
  afterEach(async () => {
  })
  it ('should fetch with special chars in sheet title', async () => {
    let data = await fetchSheetData(axios, GOOGLESPREADSHEET_ID, "Foo/Bar")
    expect(data.range).toEqual("'Foo/Bar'!A1:Z1000")
  })
  it ('should fetch with leading space and spaces in sheet title', async () => {
    let data = await fetchSheetData(axios, GOOGLESPREADSHEET_ID, " Leading Space")
    expect(data.range).toEqual("' Leading Space'!A1:Z1000")
  })
  it ('should fetch default with formatted values', async () => {
    let data = await fetchSheetData(axios, GOOGLESPREADSHEET_ID, "Datatypes")
    expect(data.values[1]).toEqual([ "Hello", "3", "2018-04-05" ])
  })
  it ('should fetch with unformatted and serialized dates if specified', async () => {
    let mode = "UNFORMATTED"
    let data = await fetchSheetData(axios, GOOGLESPREADSHEET_ID, "Datatypes", { mode })
    expect(data.values[1]).toEqual([ "Hello", 3, 43195 ])
  })
})

describe('Private Sheets', () => {
  let token = null
  beforeAll(async () => {
    token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  })
  beforeEach(async () => {
    axios.defaults.baseURL = process.env.GOOGLESHEETS_BASE_URL
    axios.defaults.params = { }
    axios.defaults.params['key'] = process.env.GOOGLESHEETS_API_KEY
  })
  afterEach(async () => {
  })
  it ('should fail to fetch a private sheet in public access mode', async () => {
    let error = null
    let options = { 
      access: 'public',
      mode: 'UNFORMATTED'
    }
    try {
      await fetchSheetData(axios, GOOGLESPREADSHEET_PRIVATE_ID, "Sheet1", options)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.response.data.error).toMatchObject({
      code: 403,
      message: "The caller does not have permission",
      status: "PERMISSION_DENIED"
    })
  })
  it ('should fetch a private sheet using IDP (Google) access token', async () => {
    // fetchMetadata(axios, id, options) {
    let options = {
      access: 'private',
      idptoken: token,
      mode: "UNFORMATTED"
    }
    let data = await fetchSheetData(axios, GOOGLESPREADSHEET_ID, "Sheet1", options)
    expect(data).toMatchObject({
      "majorDimension": "ROWS",
      "range": "Sheet1!A1:Z1000",
      "values": [ [ "Col1", "Col2", "_ignored" ], [ "v1", "v2", "ignored" ] ]
    })
  })
})
