require('dotenv').config()
const sheetutil = require('../lib/sheetutil')
const { DateTime } = require('luxon')

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

describe('Construct Docs', () => {
  let sheetDoc = { title: "title" }
  it ('should set formatted data', async () => {
    let { cols, docs } = sheetutil.constructDocs(sheetDoc, formattedData)
    expect(docs[0]).toMatchObject({
      "String": "Hello",
      "Number": "3",
      "Datetime": "2018-04-05",
    })
  })
  it ('should set unformatted data', async () => {
    let { cols, docs } = sheetutil.constructDocs(sheetDoc, unformattedData)
    expect(docs[0]).toMatchObject({
      "String": "Hello",
      "Number": 3,
      "Datetime": 43195,
    })
  })
  it ('should convert values of the docs', async () => {
    let datatypes = {
      String: "String",
      Number: "Number",
      Datetime: "Datetime"
    }
    let { cols, docs } = sheetutil.constructDocs(sheetDoc, unformattedData)
    let converted = sheetutil.convertValues(cols, docs, datatypes, { tz: "America/New_York" })
    expect(JSON.parse(JSON.stringify(converted.docs[0]))).toMatchObject({
      "String": "Hello",
      "Number": 3,
      "Datetime": "2018-04-05T00:00:00.000-04:00" // "2018-04-05"
    })
    expect(JSON.parse(JSON.stringify(converted.docs[1]))).toMatchObject({
      "String": "World",
      "Number": 3.14,
      "Datetime": "2018-04-05T12:30:04.000-04:00" // "4/5/2018 12:30:04"
    })
  })
})

describe('Datetime', () => {
  let fconv = null
  let tz = "America/New_York"
  beforeEach(async () => {
    let converter = sheetutil.createConverter({
      Date: "Datetime"
    })
    fconv = converter["Date"]
  })
  it ('should parse null value as null', async () => {
    expect(fconv(null)).toBe(null)
  })
  it ('should parse excel date number format for a specific timezone', async () => {
    let excel = 43195.52087962963 // "2018-04-05T12:30:04.000-04:00" 
    let d = fconv(excel, { tz })
    // d is luxon type which JSON serializes to ISO i.e. d.toISO()
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T12:30:04.000-04:00"}))
  })
  it ('should parse number 0 as the excel epoch date for a specific timezone', async () => {
    dzero = fconv(0, { tz })
    expect(JSON.stringify({ d: dzero })).toEqual(JSON.stringify({ d: "1899-12-30T00:00:00.000-05:00" }))
  })
  it ('should parse a date string using a user specified format', async () => {
    let str = "4/5/2018 12:30:04"
    let fmt = 'M/d/yyyy hh:mm:ss'
    d = fconv(str, { tz, fmt })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T12:30:04.000-04:00"}))
  })
  it ('should leave an ISO UTC date string in UTC timezone', async () => {
    let str = "2017-04-24T23:39:16.718Z"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d:str}))
  })
  it ('should leave an ISO + offset date string in the same offset', async () => {
    let str = "2017-04-24T19:39:16.718-07:00"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d:str}))
  })
  it ('should parse an ISO without offset in the specified timezone', async () => {
    let str = "2017-04-24T19:39:16.718"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({ d: "2017-04-24T19:39:16.718-04:00" }))
  })
  it ('should parse an ISO date (no time) as a date plus zero time in specified timezone', async () => {
    let str = "2017-04-24"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d:"2017-04-24T00:00:00.000-04:00"}))
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


const formattedData = [
  [
    "String",
    "Number",
    "Datetime"
  ],
  [
    "Hello",
    "3",
    "2018-04-05"
  ],
  [
    "World",
    "3.14",
    "4/5/2018 12:30:04"
  ],
  [
    "Old",
    "$10",
    "1/1/1886"
  ],
  [
    "Percent",
    "10%",
    "1/1/1886 12:30:04"
  ],
  [
    "Yen",
    "100",
    "¥100"
  ]
]

const unformattedData = [
  [
    "String",
    "Number",
    "Datetime"
  ],
  [
    "Hello",
    3,
    43195
  ],
  [
    "World",
    3.14,
    43195.52087962963
  ],
  [
    "Old",
    10,
    -5111
  ],
  [
    "Percent",
    0.1,
    -5110.479120370371
  ],
  [
    "Yen",
    100,
    100
  ]
]