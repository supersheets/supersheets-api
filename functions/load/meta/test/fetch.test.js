require('dotenv').config()
const axios = require('axios')
const { fetchMetadata } = require('../lib/meta')
const awsParamStore = require('aws-param-store')

// Supersheets Private View Test
// https://docs.google.com/spreadsheets/d/1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY/edit#gid=0
const GOOGLESPREADSHEET_ID = "1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY"

// Goalbook Private Supersheets Cross Domain Test
// Added service account email with edit access to this sheet
// https://docs.google.com/spreadsheets/d/1UWbjiyx0gL9tsbsKoYUeeCoiwdefNyka4Rn00NFX-pM/edit#gid=0
const GOOGLESPREADSHEET_PRIVATE_ID = "1UWbjiyx0gL9tsbsKoYUeeCoiwdefNyka4Rn00NFX-pM"

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
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      idptoken: token
    }
    try {
      await fetchMetadata(axios, GOOGLESPREADSHEET_ID, options)
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
      idptoken: token,
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL
    }
    let data = await fetchMetadata(axios, GOOGLESPREADSHEET_PRIVATE_ID, options)
    expect(data).toMatchObject({
      id: '1UWbjiyx0gL9tsbsKoYUeeCoiwdefNyka4Rn00NFX-pM',
      title: 'Goalbook Private Supersheets Cross Domain Test'
    })
  })
})




