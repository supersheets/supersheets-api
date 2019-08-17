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
      // "Datetime": "2018-04-05T00:00:00.000-04:00" // "2018-04-05"
      "Datetime": "2018-04-05T04:00:00.000Z" // "2018-04-05" (spreadsheet)
    })
    expect(JSON.parse(JSON.stringify(converted.docs[1]))).toMatchObject({
      "String": "World",
      "Number": 3.14,
      //"Datetime": "2018-04-05T12:30:04.000-04:00" // "4/5/2018 12:30:04" (spreadsheet)
      "Datetime": "2018-04-05T16:30:04.000Z"
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
    let excel = 43195.52087962963 // "2018-04-05T12:30:04.000" (spreadsheet) 
    let d = fconv(excel, { tz })
    // d is luxon type which JSON serializes to ISO i.e. d.toISO()
    //expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T12:30:04.000-04:00"}))
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T16:30:04.000Z"}))
  })
  it ('should parse excel date number format for a specific timezone', async () => {
    let tz2 = "America/Los_Angeles"
    let excel = 43195.52087962963 // "2018-04-05T12:30:04.000" (spreadsheet)
    let d = fconv(excel, { tz: tz2 })
    // d is luxon type which JSON serializes to ISO i.e. d.toISO()
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T19:30:04.000Z"}))
  })
  it ('should parse number 0 as the excel epoch date for a specific timezone', async () => {
    dzero = fconv(0, { tz }) // 1899-12-30T00:00:00.000 (spreadsheet)
    //expect(JSON.stringify({ d: dzero })).toEqual(JSON.stringify({ d: "1899-12-30T00:00:00.000-05:00" }))
    expect(JSON.stringify({ d: dzero })).toEqual(JSON.stringify({ d: "1899-12-30T05:00:00.000Z" }))
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

describe('Date', () => {
  let fconv = null
  let tz = "America/New_York"
  beforeEach(async () => {
    let converter = sheetutil.createConverter({
      Date: "Date"
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
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T00:00:00.000Z"}))
  })
  it ('should parse number 0 as the excel epoch date for a specific timezone', async () => {
    dzero = fconv(0, { tz })
    expect(JSON.stringify({ d: dzero })).toEqual(JSON.stringify({ d: "1899-12-30T00:00:00.000Z" }))
  })
  it ('should parse a date string usinguser specified format', async () => {
    let str = "4/5/2018 12:30:04"
    let fmt = 'M/d/yyyy hh:mm:ss'
    d = fconv(str, { tz, fmt })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2018-04-05T00:00:00.000Z"}))
  })
  it ('should leave an ISO UTC date string in UTC timezone', async () => {
    let str = "2017-04-24T23:39:16.718Z"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2017-04-24T00:00:00.000Z"}))
  })
  it ('should leave an ISO + offset date string in the same offset', async () => {
    let str = "2017-04-24T19:39:16.718-07:00"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d: "2017-04-24T00:00:00.000Z"}))
  })
  it ('should parse an ISO without offset in the specified timezone', async () => {
    let str = "2017-04-24T19:39:16.718"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({ d: "2017-04-24T00:00:00.000Z" }))
  })
  it ('should parse an ISO date (no time) as a date plus zero time in specified timezone', async () => {
    let str = "2017-04-24"
    let d = fconv(str, { tz })
    expect(JSON.stringify({d})).toEqual(JSON.stringify({d:"2017-04-24T00:00:00.000Z"}))
  })
})

describe('JSON', () => {
  let fconv = null
  beforeEach(async () => {
    let converter = sheetutil.createConverter({
      JSON: "JSON"
    })
    fconv = converter["JSON"]
  })
  it ('should parse null value as null', async () => {
    expect(fconv(null)).toBe(null)
  })
  it ('should a valid JSON string', async () => {
    let str = JSON.stringify({ hello: "world" })
    let obj = fconv(str)
    expect(obj).toEqual({ hello: "world" })
  })
  it ('should throw on invalid JSON string', async () => {
    let invalid = 'invalid'
    let error = null
    try {
      fconv(invalid)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual("Unexpected token i in JSON at position 0")
  })
  it ('should return a number when given a number', async () => {
    let number = 1
    expect(fconv(number)).toBe(1)
  })
  it ('should stringify and parse when given an object', async () => {
    let arr = [ 1, 2 ]
    let obj = fconv(arr)
    expect(obj).toEqual([1, 2])
    expect(obj === arr).toBe(false)
  })
})

describe('StringList', () => {
  let fconv = null
  beforeEach(async () => {
    let converter = sheetutil.createConverter({
      StringList: "StringList"
    })
    fconv = converter["StringList"]
  })
  it ('should parse null as empty array', async () => {
    expect(fconv(null)).toEqual([])
  })
  it ('should treat a single value as an array with one value', async () => {
    let str = "One"
    expect(fconv(str)).toEqual([ "One" ])
  })
  it ('should split on newline', async () => {
    let str = `One\nTwo\nThree`
    expect(fconv(str)).toEqual([ "One", "Two", "Three" ])
  })
  it ("should split on a custom separator", async () => {
    let str = `One,Two,Three`
    expect(fconv(str, { separator: ',' })).toEqual([ "One", "Two", "Three" ])
  })
  it ('should strip whitespace', async () => {
    let str = ` One\t\n\tTwo`
    expect(fconv(str)).toEqual([ "One", "Two" ])
  })
  it ('should filter all empty items', async () => {
    let str = `\n\nOne\nTwo\n`
    expect(fconv(str)).toEqual([ "One", "Two" ])
  })
  it ('should string and array a single number', async () => {
    let number = 1
    expect(fconv(number)).toEqual([ "1" ])
  })
  it ('should throw on any object', async () => {
    let obj = { hello: "world" }
    let error = null
    try {
      fconv(obj)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual("Could not convert value [object Object] to StringList")
  })
})

describe('Number', () => {
  let numconv = null
  let intconv = null
  let floatconv = null
  beforeEach(async () => {
    let converter = sheetutil.createConverter({
      Number: "Number",
      Int: "Int",
      Float: "Float"
    })
    numconv = converter["Number"]
    intconv = converter["Int"]
    floatconv = converter["Float"]
  })
  it ('should parse a float as int', async () => {
    expect(intconv(1.1)).toEqual(1)
  })
  it ('should parse a string as a int', async () => {
    expect(intconv("1.1")).toEqual(1)
  })
  it ('should parse a string as a float', async () => {
    expect(floatconv("1.1")).toEqual(1.1)
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