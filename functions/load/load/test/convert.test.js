require('dotenv').config()
const { DateTime } = require('luxon')

const {
  createConverter
} = require('../lib/convert')

describe('Datetime', () => {
  let fconv = null
  let tz = "America/New_York"
  beforeEach(async () => {
    let converter = createConverter({
      Date: "Datetime"
    })
    fconv = converter["Date"]
  })
  it ('should parse null value as null', async () => {
    expect(fconv(null)).toBe(null)
  })
  it ('should parse undefined as null', async () => {
    expect(fconv(undefined)).toBe(null)
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
    let converter = createConverter({
      Date: "Date"
    })
    fconv = converter["Date"]
  })
  it ('should parse null value as null', async () => {
    expect(fconv(null)).toBe(null)
  })
  it ('should parse undefined as null', async () => {
    expect(fconv(undefined)).toBe(null)
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
    let converter = createConverter({
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
    let converter = createConverter({
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
    let converter = createConverter({
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