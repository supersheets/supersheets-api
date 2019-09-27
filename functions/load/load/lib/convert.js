
const { DateTime } = require('luxon')
const allkeys = require('all-object-keys')
const { JSONPath } = require('jsonpath-plus')
const { markdown } = require('@supersheets/docdown')

function isNullOrUndefined(v) {
  return v === null || v === undefined
}

function convertValues(cols, docs, datatypes, options) {
  let conv = createConverter(datatypes)
  options = options || { }
  for (let doc of docs) {
    for (let col of cols) {
      if (conv[col]) {
        try {
          doc[col] = conv[col](doc[col], options)
        } catch (err) {
          doc[col] = null 
          doc["_errors"].push(JSON.stringify({
            field: col, message: err.message
          }))
        }
      }
      if (datatypes[col] == "GoogleDoc" && doc[col] && (typeof doc[col] == 'object')) {
        let obj = doc[col]
        let googledoc = obj["_doc"]
        delete obj["_doc"]
        let fields = Object.getOwnPropertyNames(obj) // allkeys(obj)
        for (let field of fields) {
          let full = `${col}.${field}`
          let f = conv[full]
          if (!f) {
            f = convertToPlainText  // default googledoc field converter
          }
          try {
            obj[field] = f(obj[field], { doc: googledoc })
          } catch (err) {
            obj[field] = null 
            doc["_errors"].push(JSON.stringify({
              field: full, message: err.message
            }))
          }
        }
      }
    }
  }
  return { cols, docs }
}

function createConverter(datatypes) {
  let conv = { }
  for (let col in datatypes) {
    let f = null
    if (col.includes('.')) {
      f = getDocValueConv(datatypes[col], col, datatypes)
    } else {
      f = getConv(datatypes[col], col, datatypes)
    }
    if (!f) {
      throw new Error(`Unknown type ${datatypes[col]}`)
    }
    conv[col] = f
  }
  return conv
}

function getConv(datatype, col, datatypes) {
  switch(datatype) {
    case "Boolean":
      return convertToBoolean
    case "String":
      return convertToString
    case "Number":
      return convertToNumber
    case "Int":
      return convertToInt
    case "Float":
      return convertToNumber
    case "Date":
      return convertToDate
    case "Datetime":
      return convertToDatetime
    case "JSON":
      return convertToJSON
    case "StringList":
      return convertToStringList
    case "GoogleDoc":
      // we just noop because we'll have separate
      // logic that will deal with Google Docs
      return convertNoop
    default:
      return null
  }
}

function getDocValueConv(datatype, col, datatypes) {
  let conv = getConv(datatype, col, datatypes)
  if (conv) {
    return (v, options) => {
      return conv(convertToPlainText(v), options)
    }
  }
  switch(datatype) {
    case "PlainText": 
      return convertToPlainText
    case "GoogleJSON": 
      return convertToGoogleJSON
    case "Markdown":
      return convertToMarkdown
    default:
      return convertToPlainText
  }
}

const convertToString = (v) => {
  if (isNullOrUndefined(v)) return null
  switch(typeof v) {
    case "string":
      return v
    case "number":
      return v.toString()
    case "object":
      return JSON.stringify(v)
    case "boolean":
      return v && "TRUE" || "FALSE"
    default:
      throw new Error(`Could not convert value ${v} to type String`)
  }
}

const convertToNumber = (v) => {
  if (isNullOrUndefined(v)) return null
  switch(typeof v) {
    case "number": 
      return v
    case "string": 
      if (isNaN(parseFloat(v))) {
        throw new Error(`${v} is NaN`)
      }
      return parseFloat(v)
    case "boolean":
      return v && 1 || 0
    default:
      throw new Error(`Could not convert value ${v} to type Number`)
  }
}

const convertToInt = (v) => {
  if (isNullOrUndefined(v)) return null
  switch(typeof v) {
    case "number": 
      return Math.floor(v)
    case "string": 
      if (isNaN(parseInt(v))) {
        throw new Error(`${v} is NaN`)
      }
      return parseInt(v)
    case "boolean":
      return v && 1 || 0
    default:
      throw new Error(`Could not convert value ${v} to type Int`)
  }
}


// 0 false 1 (or any number) is true
// whitepsce 
const convertToBoolean = (v) => {
  if (isNullOrUndefined(v)) return null
  switch (typeof v) {
    case "boolean": 
      return v
    case "string":
      return v.trim() && true || false
    case "number":
      return (v !== 0) && true || false
    default:
      throw new Error(`Could not convert value ${v} to type Boolean`)
  }
}

// what is the value of empty date cell? 
// it doesn't seem to be null because 
// we are throwing error. Need to test this.
const convertToDatetime = (v, options) => {
  options = options || { }
  let tz = options.tz || "utc"
  if (v === null || v === undefined) return null
  switch(typeof v) {
    case "number": 
      return getISOStringFromExcel(v, tz)
    case "string": 
      if (v.trim() === "") return null
      let fmt = options.fmt || 'ISO' 
      return parseDatetimeFromString(v, fmt, tz)
    default:
      throw new Error(`Could not convert value ${v} to type Date`)
  }
}

// Will use the month, day, year and store in UTC WITHOUT tz converstion
// For example, if the the sheet's timezone is
// the value is the equivalent of '2009-04-01'('America/Los_Angeles') 
// what will be stored is 'Z' (UTC)
const convertToDate = (v, options) => {
  options = options || { }
  let tz = "utc"
  if (v === null || v === undefined) return null
  switch(typeof v) {
    case "number": 
      return getISODateStringFromExcel(v, tz)
    case "string": 
      if (v.trim() === "") return null
      let fmt = options.fmt || 'ISO' 
      return parseDateFromString(v, fmt, tz)
    default:
      throw new Error(`Could not convert value ${v} to type Date`)
  }
}

const convertToJSON = (v) => {
  if (isNullOrUndefined(v)) return null
  switch (typeof v) {
    case "string":
      return JSON.parse(v)
    case "number": 
      return JSON.parse(v)
    case "object":
      return JSON.parse(JSON.stringify(v))
    default:
      throw new Error(`Could not convert value ${v} to JSON`)
  }
}

const convertToStringList = (v, options) => {
  options = options || { }
  let separator = options.separator || '\n'
  if (isNullOrUndefined(v)) return null
  switch (typeof v) {
    case "string":
      return v.split(separator).map(s => s.trim()).filter(s => s)
    case "number":
      return [ v.toString() ]
    case "boolean":
      return v && [ "TRUE" ] || [ "FALSE" ]
    default:
      throw new Error(`Could not convert value ${v} to StringList`)
  }
}

const convertNoop = (v) => {
  return v
}

// Google Doc Converters 

const convertToPlainText = (v) => {
  if (typeof v === 'string') {
    if (v.trim() === "") return null
    return v
  }
  let path = "$..elements..textRun..content"
  let lines = JSONPath(path, v)
  let val = lines.join('').trim()
  if (val === "") return null
  return val
}

const convertToGoogleJSON = (v) => {
  return v
}

const convertToMarkdown = (v, { doc }) => {
  return markdown(doc, { content: v })
}


function getISOStringFromExcel(excelDate, tz) {
  let d = getJsDateFromExcel(excelDate)
  let str = d.toISOString().slice(0, -1) // remove 'Z' so we have a tz agnostic date
  // return DateTime.fromISO(str, { zone: tz })
  let datetime = DateTime.fromISO(str, { zone: tz })  // we have the literal time in the local timezone (the spreadsheet)
  return datetime.setZone('utc') // we convert local time to utc
}

function getISODateStringFromExcel(excelDate, tz) {
  let d = getJsDateFromExcel(excelDate)
  let str = d.toISOString().split('T')[0] // 2018-04-05
  return DateTime.fromISO(str, { zone: tz })
}

function getJsDateFromExcel(excelDate) { 
  return new Date(Math.round((excelDate - (25567 + 2))*86400)*1000) 
}

function parseDatetimeFromString(str, fmt, tz) {
  let d = null
  if (fmt == "ISO") {
    // setZone only sets the zone if str does not include offset
    d = DateTime.fromISO(str, { zone: tz, setZone: true })
  } else {
    d = DateTime.fromFormat(str, fmt, { zone: tz })
  }
  if (!d.isValid) {
    throw new Error(`${d.invalidReason}: ${d.invalidExplanation}`)
  }
  return d
}

function parseDateFromString(str, fmt, tz) {
  let d = null
  if (fmt == "ISO") {
    // setZone only sets the zone if str does not include offset
    str = str.split('T')[0]
    d = DateTime.fromISO(str, { zone: tz, setZone: true }).set({
      hour: 0, minute: 0, seconds: 0, millisecond: 0 
    })
  } else {
    d = DateTime.fromFormat(str, fmt, { zone: tz }).set({
      hour: 0, minute: 0, seconds: 0, millisecond: 0 
    })
  }
  if (!d.isValid) {
    throw new Error(`${d.invalidReason}: ${d.invalidExplanation}`)
  }
  return d
}

module.exports = {
  convertValues,
  createConverter,
  convertToPlainText
}