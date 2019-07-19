require('dotenv').config()
const axios = require('axios')
const { fetchSheetData } = require('../lib/load')

// Supersheets Public View Test
const GOOGLESPREADSHEET_ID = "1m4a-PgNeVTn7Q96TaP_cA0cYQg8qsUfmm3l5avK9t2I"

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
})
