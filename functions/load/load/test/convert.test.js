require('dotenv').config()
const fs = require('fs')
const path = require('path')
const testdocs = initTestDocs([ "normal.test.json"])
const { DateTime } = require('luxon')
const { extractData  } = require('../lib/docs')

const {
  convertValues,
  createConverter
} = require('../lib/convert')

describe("convertValues", () => {
  it ('should convert to String if there is not user configured datatype', async () => {
    let cols = [ "Number", "String" ]
    let docs = [ { "Number": 1, "String": "hello" } ] 
    let datatypes = {
      "String": "String"
    }
    let converted = convertValues(cols, docs, datatypes)
    expect(converted.docs[0]).toEqual({
      "Number": "1",
      "String": "hello"
    })
  })
})

describe("GoogleDoc", () => {
  let googledoc = testdocs["normal.test.json"]
  let cols = null
  let docs = null
  beforeEach(async () => {
    cols = [ "GoogleDoc" ]
    docs = [ { 
      "GoogleDoc": extractData(googledoc),
      "_errors": [ ]
    } ]
    let copy = extractData(googledoc)
    delete copy["_content"]
    delete copy["_doc"]
  })
  it ('should leave data values as strings by default', async () => {
    let datatypes = {
      "GoogleDoc": "GoogleDoc"
    }
    let converted = convertValues(cols, docs, datatypes)
    expect(converted.docs[0]).toMatchObject({
      "GoogleDoc": {
        "title": "A post with a cover image",
        "date": "2019-01-07",
        "published": "true",
        "tags": "Markdown",
        "series": "false",
        "cover_image": "./images/alexandr-podvalny-220262-unsplash.jpg",
        "canonical_url": "false",
        "description": "Markdown is intended to be as easy-to-read and easy-to-write as is feasible. Readability, however, is emphasized above all else. A Markdown-formatted document should be publishable as-is, as plain text, without looking like it's been marked up with tags or formatting instructions.",
        "_content": expect.anything(),
        "_text": expect.anything()
      }
    })
  })
  it ('should convert GoogleDoc data field types', async () => {
    let datatypes = {
      "GoogleDoc": "GoogleDoc",
      "GoogleDoc.date": "Date",
      "GoogleDoc.series": "Boolean",
    }
    let converted = convertValues(cols, docs, datatypes)
    expect(converted.docs[0]).toMatchObject({
      "GoogleDoc": {
        "date": expect.anything(),
        "series": false
      }
    })
    expect(converted.docs[0].GoogleDoc.date.toISO()).toEqual("2019-01-07T00:00:00.000Z")
  })
  // it ('should convert GoogleDoc value field types', async () => {
  //   let datatypes = {
  //     "GoogleDoc": "GoogleDoc",
  //     "GoogleDoc.name": "PlainText",
  //     "GoogleDoc.type": "GoogleJSON",
  //     "GoogleDoc.value": "Markdown"
  //   }
  //   let converted = convertValues(cols, docs, datatypes)
  //   expect(converted.docs[0]).toMatchObject({
  //     "GoogleDoc": {
  //       "name": "body",
  //       "type": JSON.stringify([
  //         {
  //           "startIndex": 218,
  //           "endIndex": 225,
  //           "paragraph": {
  //             "elements": [
  //               {
  //                 "startIndex": 218,
  //                 "endIndex": 225,
  //                 "textRun": {
  //                   "content": "string\n",
  //                   "textStyle": {}
  //                 }
  //               }
  //             ],
  //             "paragraphStyle": {
  //               "namedStyleType": "NORMAL_TEXT",
  //               "lineSpacing": 100,
  //               "direction": "LEFT_TO_RIGHT",
  //               "avoidWidowAndOrphan": false
  //             }
  //           }
  //         }
  //       ]),
  //       "value": expect.anything()
  //     }
  //   })
  // })
})

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
  it ('should throw if unable to parse datetime', async () => {
    let error = null
    try {
      let str = "hello-world"
      let d = fconv(str, { tz })
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`unparsable: the input "hello-world" can't be parsed as ISO 8601`)
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
  it ('should throw if unable to parse date', async () => {
    let error = null
    try {
      let str = "hello-world"
      let d = fconv(str, { tz })
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`unparsable: the input "hello-world" can't be parsed as ISO 8601`)
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
  it ('should parse null as null', async () => {
    expect(fconv(null)).toEqual(null)
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
  it ('should string and array a single boolean', async () => {
    expect(fconv(true)).toEqual([ "TRUE" ])
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

describe('Boolean', () => {
  let boolconv = null
  beforeEach(async () => {
    let converter = createConverter({
      Boolean: "Boolean"
    })
    boolconv = converter["Boolean"]
  })
  it ('should return undefined as null', async () => {
    expect(boolconv(undefined)).toEqual(null)
  })
  it ('should return 0 as false', async () => {
    expect(boolconv(0)).toEqual(false)
  })
  it ('should return "" as false', async () => {
    expect(boolconv("")).toEqual(false)
  })
  it ('should return " " as false', async () => {
    expect(boolconv(" ")).toEqual(false)
  })
  it ('should return 1 as true', async () => {
    expect(boolconv(1)).toEqual(true)
  })
  it ('should return "Y" as true', async () => {
    expect(boolconv("Y")).toEqual(true)
  })
})

describe('String', () => {
  let strconv = null
  beforeEach(async () => {
    let converter = createConverter({
      String: "String"
    })
    strconv = converter["String"]
  })
  it ('should return undefined as null', async () => {
    expect(strconv(undefined)).toEqual(null)
  })
  it ('should return true as "TRUE', async () => {
    expect(strconv(true)).toEqual("TRUE")
  })
  it ('should return false as "FALSE', async () => {
    expect(strconv(false)).toEqual("FALSE")
  })
  it ('should return 1 as "1"', async () => {
    expect(strconv(1)).toEqual("1")
  })
  it ('should return 1.1 as "1.1"', async () => {
    expect(strconv(1.1)).toEqual("1.1")
  })
})

describe('Int', () => {
  let conv = null
  beforeEach(async () => {
    let converter = createConverter({
      Int: "Int"
    })
    conv = converter["Int"]
  })
  it ('should return undefined as null', async () => {
    expect(conv(undefined)).toEqual(null)
  })
  it ('should return true as 1', async () => {
    expect(conv(true)).toEqual(1)
  })
  it ('should return false as 0', async () => {
    expect(conv(false)).toEqual(0)
  })
  it ('should return 1.3 as 1', async () => {
    expect(conv(1.3)).toEqual(1)
  })
  it ('should throw on "hello"', async () => {
    let error = null
    try { 
      conv("hello")
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`hello is NaN`)
  })
})

describe('Float', () => {
  let conv = null
  beforeEach(async () => {
    let converter = createConverter({
      Float: "Float"
    })
    conv = converter["Float"]
  })
  it ('should return undefined as null', async () => {
    expect(conv(undefined)).toEqual(null)
  })
  it ('should return true as 1', async () => {
    expect(conv(true)).toEqual(1)
  })
  it ('should return false as 0', async () => {
    expect(conv(false)).toEqual(0)
  })
  it ('should return 1.3 as 1.3', async () => {
    expect(conv(1.3)).toEqual(1.3)
  })
  it ('should throw on "hello"', async () => {
    let error = null
    try { 
      conv("hello")
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`hello is NaN`)
  })
})

function initTestDocs(filenames) {
  let docs = { }
  for (let name of filenames) {
    docs[name] = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs', name)))
  }
  return docs
}