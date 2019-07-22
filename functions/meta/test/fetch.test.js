require('dotenv').config()
const axios = require('axios')
const { fetchMetadata } = require('../lib/meta')

// Supersheets Private View Test
// https://docs.google.com/spreadsheets/d/1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY/edit#gid=0
const GOOGLESPREADSHEET_ID = "1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY"
const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN

describe('Private Sheets', () => {
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
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY
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
      access: 'private',
      idptoken: GOOGLE_ACCESS_TOKEN,
      GOOGLESHEETS_BASE_URL: process.env.GOOGLESHEETS_BASE_URL,
      GOOGLESHEETS_API_KEY: process.env.GOOGLESHEETS_API_KEY
    }
    let data = await fetchMetadata(axios, GOOGLESPREADSHEET_ID, options)
    expect(data).toMatchObject({
      id: '1JYT2HbToNeafKuODTW-gdwvJwmZ0MRYCqibRzZOlfJY',
      title: 'Supersheets Private View Test'
    })
  })
})




