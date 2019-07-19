require('dotenv').config()
const sheetutil = require('../lib/sheetutil')
const moment = require('moment-timezone')

describe('Schema', () => {
  beforeEach(async () => {
  })
  it ('should get samples from docs', async () => {
    let { cols, docs } = createTestData()
    let samples = sheetutil.getSampleColumnValues(cols, docs)
    expect(samples).toMatchObject({
      "col1": "val1a",
      "col2": "val2b",
      "col3": null
    })
  })
  it ('should create schema from columns and samples', async () => {
    let metadata = createTestMetadata()
    sheetutil.updateSchema(metadata)
    expect(metadata.schema.columns.length).toBe(4)
    expect(metadata.schema.columns.map(col => col.name)).toEqual([ "A", "B", "C", "D" ])
    expect(metadata.schema.columns.map(col => col.sample)).toEqual([ "A1", "B1", null, "D2" ])
    expect(metadata.schema.columns[0].sheets).toEqual([ "Sheet1" ])
    expect(metadata.schema.columns[1].sheets).toEqual([ "Sheet1", "Sheet2" ])
    expect(metadata.schema.columns[2].sheets).toEqual([ "Sheet1" ])
    expect(metadata.schema.columns[3].sheets).toEqual([ "Sheet2" ])
  })
})

describe('Datatypes', () => {
  it ('should initialize time string', async () => {
    
    let s = "4/5/2018 12:30:04"
    let tz = "America/Los_Angeles"
    let locale = "en_US"
    moment.locale(locale)
    let m = moment.tz(s, tz)
    console.log(m.format())
    console.log(m.toISOString())
  })
})

function createTestData() {
  let docs = [ {
    "col1": "val1a"
  }, {
    "col1": "val1b",
    "col2": "val2b"
  } ]

  let cols = [ "col1", "col2", "col3" ]

  return { cols, docs }
}

function createTestMetadata() {
  let metadata = { }
  metadata.sheets = [ {
    title: "Sheet1",
    columns: [ "A", "B", "C" ],
    samples: {
      "A": "A1",
      "B": "B1",
      "C": null
    }
  }, {
    title: "Sheet2",
    columns: [ "B", "D" ],
    samples: {
      "B": "B2",
      "D": "D2"
    }
  } ]
  return metadata
}