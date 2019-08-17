const uuidV4 = require('uuid/v4')
const { DateTime } = require('luxon')
const IGNORE_PREFIX = "_"

function getLoadMode(metadata) {
  return metadata.config && metadata.config.mode || 'FORMATTED'
}

function getAccess(metadata) {
  return metadata.config && metadata.config.access || 'public'
}

function constructDocs(sheetDoc, data) {
  var cols = [ ]
  var docs = [ ]
  if (data.length > 0) {
    cols = data[0]
  }
  if (data.length > 1) {
    for (var i = 1; i < data.length; i++) {
      var doc = { 
        "_sheet": sheetDoc.title, 
        "_row": (i+1),
        "_errors": [ ]
      };
      for (var j = 0; j < cols.length; j++) {
        let column = cols[j]
        if (!column.startsWith(IGNORE_PREFIX)) {
          doc[cols[j]] = data[i][j]
        }
      }
      docs.push(doc)
    }
  }
  // We have to do this at the end so it doesn't throw off indexing (i, j)
  cols = cols.filter(name => !name.startsWith(IGNORE_PREFIX))
  return { cols, docs }
}

function convertValues(cols, docs, datatypes, options) {
  let conv = createConverter(datatypes)
  options = options || { }
  for (let doc of docs) {
    for (let col of cols) {
      try {
        if (conv[col]) {
          doc[col] = conv[col](doc[col], options)
        }
      } catch (err) {
        doc["_errors"].push({
          col, message: err.message
        })
      }
    }
  }
  return { cols, docs }
}

function createConverter(datatypes) {
  let conv = { }
  for (let col in datatypes) {
    switch(datatypes[col]) {
      case "Boolean":
        conv[col] = convertToBoolean
        break
      case "String":
        conv[col] = convertToString
        break
      case "Number":
        conv[col] = convertToNumber
        break
      case "Int":
        conv[col] = convertToInt
        break
      case "Float":
        conv[col] = convertToNumber
        break
      case "Date":
        conv[col] = convertToDate
        break
      case "Datetime":
        conv[col] = convertToDatetime
        break
      case "JSON":
        conv[col] = convertToJSON
        break
      case "StringList":
        conv[col] = convertToStringList
        break
      case "GoogleDoc":
        // we just noop because we'll have separate
        // logic that will deal with Google Docs
        conv[col] = convertNoop
        break
      default:
        throw new Error(`Unknown type ${datatypes[col]}`)
    }
  }
  return conv
}

const convertToString = (v) => {
  if (!v) return ''
  switch(typeof v) {
    case "string":
      return v
    case "number":
      return v.toString()
    case "object":
      return JSON.stringify(v)
    default:
      throw new Error(`Could not convert value ${v} to type String`)
  }
}

const convertToNumber = (v) => {
  if (!v) return 0
  switch(typeof v) {
    case "number": 
      return v
    case "string": 
      return new Number(v)
    default:
      throw new Error(`Could not convert value ${v} to type Number`)
  }
}

const convertToInt = (v) => {
  if (!v) return 0
  switch(typeof v) {
    case "number": 
      return Math.floor(v)
    case "string": 
      return parseInt(v)
    default:
      throw new Error(`Could not convert value ${v} to type Int`)
  }
}


const convertToBoolean = (v) => {
  if (!v) return false
  return true
}

const convertToDatetime = (v, options) => {
  options = options || { }
  let tz = options.tz || "utc"
  if (v === null) return null
  switch(typeof v) {
    case "number": 
      return getISOStringFromExcel(v, tz)
    case "string": 
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
  if (v === null) return null
  switch(typeof v) {
    case "number": 
      return getISODateStringFromExcel(v, tz)
    case "string": 
      let fmt = options.fmt || 'ISO' 
      return parseDateFromString(v, fmt, tz)
    default:
      throw new Error(`Could not convert value ${v} to type Date`)
  }
}

const convertToJSON = (v) => {
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
  if (!v) return [ ]
  switch (typeof v) {
    case "string":
      return v.split(separator).map(s => s.trim()).filter(s => s)
    case "number":
      return [ v.toString() ]
    default:
      throw new Error(`Could not convert value ${v} to StringList`)
  }
}

const convertNoop = (v) => {
  return v
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
  if (fmt == "ISO") {
    // setZone only sets the zone if str does not include offset
    return DateTime.fromISO(str, { zone: tz, setZone: true })
  }
  return DateTime.fromFormat(str, fmt, { zone: tz })
}

function parseDateFromString(str, fmt, tz) {
  if (fmt == "ISO") {
    // setZone only sets the zone if str does not include offset
    str = str.split('T')[0]
    return DateTime.fromISO(str, { zone: tz, setZone: true }).set({
      hour: 0, minute: 0, seconds: 0, millisecond: 0 
    })
  }
  return DateTime.fromFormat(str, fmt, { zone: tz }).set({
    hour: 0, minute: 0, seconds: 0, millisecond: 0 
  })
}

function updateSpreadsheetCountsFromSheets(metadata) {
  metadata.nrows = 0
  metadata.ncols = 0
  metadata.ncells = 0
  for (var i=0; i<metadata.sheets.length; i++) {
    if (metadata.sheets[i].skip) continue
    metadata.nrows += metadata.sheets[i].nrows
    metadata.ncols += metadata.sheets[i].ncols
    metadata.ncells += metadata.sheets[i].ncells
  }
  metadata.updated_at = new Date()
  return metadata
}

function updateSheetDoc(sheet, docs) {
  let preview = {}
  if (docs.docs.length > 0) {
    preview = docs.docs[0]
  } 
  sheet.preview = preview
  sheet.columns = docs.cols
  sheet.samples = getSampleColumnValues(sheet.columns, docs.docs)
  sheet.nrows = docs.docs.length
  sheet.ncols = docs.cols.length
  sheet.ncells = (docs.docs.length * docs.cols.length)
  sheet.updated_at = new Date()
  return sheet
}

function getSampleColumnValues(cols, docs) {
  let samples = { }
  for (let name of cols) {
    samples[name] = null
    for (let doc of docs) {
      if (doc[name]) {
        samples[name] = doc[name]
        break
      }
    }
  }
  return samples
}

function updateSchema(metadata) {
  let datatypes = metadata.config && metadata.config.mode == "UNFORMATTED" && metadata.config.datatypes || { }
  if (!metadata.schema) {
    metadata.schema = { }
  }
  metadata.schema.columns = [ ]
  let schema = metadata.schema
  let cols = { }
  for (let sheet of metadata.sheets) {
    for (let column of sheet.columns) {
      if (!cols[column]) {
        schema.columns.push({
          name: column,
          datatype: datatypes[column] || "String",
          sample: sheet.samples[column],
        })
        cols[column] = [ sheet.title ]
      } else {
        cols[column].push(sheet.title)
      }
    }
  }
  for (col of schema.columns) {
    col.sheets = cols[col.name]
  }
  // metadata.schema = schema
  return metadata 
}

function updateGoogleDocSchemas(metadata, schemas) {
  if (!metadata.schema) {
    metadata.schema = { }
  }
  if (!metadata.schema.docs) {
    metadata.schema.docs = schemas
    return
  }
  for (let col in schemas) {
    if (metadata.schema.docs[col]) {
      updateExistingGoogleDocSchema(metadata.schema.docs[col], schemas[col])
    } else {
      metadata.schema.docs[col] = schemas[col]
    }
  }
}

function updateExistingGoogleDocSchema(current, schema) {
  for (let key of schema.columns) {
    if (!current.columns.find(k => k.name == key.name)) {
      current.columns.push(key)
    }
  }
}


module.exports = {
  getLoadMode,
  getAccess,
  updateSpreadsheetCountsFromSheets,
  constructDocs,
  convertValues,
  updateSheetDoc,
  getSampleColumnValues,
  updateSchema,
  createConverter,
  updateGoogleDocSchemas
}

// function detectNewColumns(dataObject, sheetDoc) {
//   var fields = Object.keys(dataObject).filter(isUserField);
//   var currentCols = sheetDoc.columns.filter(isUserField);
  
//   var newFields = [ ];
  
//   for (var i=0; i<fields.length; i++) {
//     var field = fields[i];
    
//     for (var j=0; j<currentCols.length; j++) {
//       if (field == currentCols[i]) {
//         newFields.push(field)
//       }
//     }
//   }
  
//   return newFields;
// }

// function generateNewColumnBatchUpdates(newCols) {
  
// }

// function doesSheetExist(sheetTitle, spreadsheetDoc) {
//   for (var i=0; i<spreadsheetDoc.sheets; i++) {
//     if (sheetTitle == spreadsheetDoc.sheets[i].title) {
//       return true;
//     }
//   } 
//   return false;
// }

// function isUserField(fieldName) {
//   return !field.startsWith("_");
// }

// Google Sheet API
// https://developers.google.com/sheets/api/samples/writing#append_values

// POST https://sheets.googleapis.com/v4/spreadsheets/spreadsheetId/values/Sheet1!A1:E1:append?valueInputOption=USER_ENTERED
// {
//   "range": "Sheet1!A1:E1",
//   "majorDimension": "ROWS",
//   "values": [
//     ["Door", "$15", "2", "3/15/2016"],
//     ["Engine", "$100", "1", "3/20/2016"],
//   ],
// }
// 
// {
//   "spreadsheetId": spreadsheetId,
//   "tableRange": "Sheet1!A1:D2",
//   "updates": {
//     "spreadsheetId": spreadsheetId,
//     "updatedRange": "Sheet1!A3:D4",
//     "updatedRows": 2,
//     "updatedColumns": 4,
//     "updatedCells": 8,
//   }
// }


// {
//   "range": "Sheet1!A1:E1",
//   "majorDimension": "ROWS",
//   "values": [
//     ["Door", "$15", "2", "3/15/2016"],
//     ["Engine", "$100", "1", "3/20/2016"],
//   ],
// }

// function prepareAppendRequestBody(dataObject, sheetDoc) {
//   var appendReq = { };
//   var range = getGoogleSheetHeaderRange(sheetDoc);
//   var row = getGoogleSheetRowValues(dataObject, sheetDoc.columns);
  
//   return {
//     range: range,
//     majorDimension: "ROWS",
//     "values": [ row ]
//   }
// }

// function createDataObjectsFromUpdatedData(colNames, updatedData) {
//   var updatedRange = updatedData.range;
//   var sheetTitle = getSheetTitleFromRange(updatedRange);
//   var firstRow = getFirstRowInRange(updatedRange);
//   var rows = updatedData.values;
  
//   var dataObjects = [ ];
  
//   for (var i=0; i<rows.length; i++) {
//     var row = rows[i];
//     var doc = { 
//       "_sheet": sheetTitle, 
//       "_row": firstRow
//     };
//     for (var j = 0; j < colNames.length; j++) {
//       doc[colNames[j]] = row[j]
//     }
//     dataObjects.push(doc)
//     firstRow += 1;
//   }
//   return dataObjects;
// } 

// function getSheetTitleFromRange(range) {
//   return range.split("!")[0]  
// }

// function getFirstRowInRange(range) {
//   var r = /\d+/;
//   var colStr = (range.split("!")[1].match(r));
//   return parseInt(colStr);
// }


// function getSheetInSpreadsheet(spreadsheet, sheetTitle) {
//   for (var i=0; i<spreadsheet.sheets.length; i++) {
//     if (sheetTitle == spreadsheet.sheets[i].title) {
//       return spreadsheet.sheets[i];
//     }
//   }  
//   return null;
// }



// function getGoogleSheetHeaderRange(sheetDoc) {
//   var startRange = `${translateColumnToLetter(0)}1`;
//   var endRange = `${translateColumnToLetter(sheetDoc.columns.length-1)}1`;
//   return `${sheetDoc.title}!${startRange}:${endRange}`;
// }

// function getGoogleSheetRowValues(dataObject, columnNames) {
//   var row = [ ];
//   for (var i=0; i<columnNames.length; i++) {
//     var val = dataObject[columnNames[i]];
//     if (val == undefined) {
//       // object does not have the key, we want Sheets to keep existing value of column
//       row.push(null);
//     } else if (val == null || val == "") {
//       // object has key but it has no value, we want Sheets to clear the value of the column
//       row.push("");
//     } else {
//       row.push(val);
//     }
//   }
//   return row;
// }

// function translateColumnToLetter(colIndex) {
//   var alphabet = [ "a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z" ];
//   var overflowChar ="";
//   var overflow = Math.floor(colIndex / alphabet.length);
//   if (overflow > 0) {
//     overflowChar = alphabet[overflow].toUpperCase();
//   }
//   var mod = colIndex % alphabet.length;
//   return `${overflowChar}${alphabet[mod].toUpperCase()}`
// }


// https://developers.google.com/sheets/api/samples/rowcolumn

// POST https://sheets.googleapis.com/v4/spreadsheets/spreadsheetId:batchUpdate
// {
//   "requests": [
//     {
//       "appendDimension": {
//         "sheetId": sheetId,
//         "dimension": "ROWS",
//         "length": 3
//       }
//     },
//     {
//       "appendDimension": {
//         "sheetId": sheetId,
//         "dimension": "COLUMNS",
//         "length": 1
//       }
//     }
//   ]
// }
