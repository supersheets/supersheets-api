'use strict';

const uuidV4 = require('uuid/v4')

function createMetadataFromGoogleSpreadsheet(doc) {
  var metadataDoc = {
    uuid: uuidV4(),
    id: doc.spreadsheetId,
    url: doc.spreadsheetUrl,
    title: doc.properties.title,
    tz: doc.properties.timeZone,
    local: doc.properties.locale,
    updated_at: new Date(), 
    //nrows: -1,
    //ncols: -1,
    //ncells: -1,
  }
  
  var sheets = [ ];
  
  for (var i=0; i<doc.sheets.length; i++) {
    var sheetDoc = doc.sheets[i].properties; 
    sheets.push({
      id: sheetDoc.sheetId,
      title: sheetDoc.title,
      index: sheetDoc.index,
      sheetType: sheetDoc.sheetType
      //nrows: -1,
      //ncols: -1,
      //ncells: -1,
    })
  }
  metadataDoc.sheets = sheets;
  return metadataDoc;
}

function updateSpreadsheetCountsFromSheets(spreadsheetDoc) {
  spreadsheetDoc.nrows = 0;
  spreadsheetDoc.ncols = 0;
  spreadsheetDoc.ncells = 0;
  for (var i=0; i<spreadsheetDoc.sheets.length; i++) {
    spreadsheetDoc.nrows += spreadsheetDoc.sheets[i].nrows;
    spreadsheetDoc.ncols += spreadsheetDoc.sheets[i].ncols;
    spreadsheetDoc.ncells += spreadsheetDoc.sheets[i].ncells;
  }
  spreadsheetDoc.updated_at = new Date();
  return {
    nrows: spreadsheetDoc.nrows,
    ncols: spreadsheetDoc.ncols,
    ncells: spreadsheetDoc.ncells,
    updated_at: spreadsheetDoc.updated_at
  }
}

function createDataObjectsFromUpdatedData(colNames, updatedData) {
  var updatedRange = updatedData.range;
  var sheetTitle = getSheetTitleFromRange(updatedRange);
  var firstRow = getFirstRowInRange(updatedRange);
  var rows = updatedData.values;
  
  var dataObjects = [ ];
  
  for (var i=0; i<rows.length; i++) {
    var row = rows[i];
    var doc = { 
      "_sheet": sheetTitle, 
      "_row": firstRow
    };
    for (var j = 0; j < colNames.length; j++) {
      doc[colNames[j]] = row[j]
    }
    dataObjects.push(doc)
    firstRow += 1;
  }
  return dataObjects;
} 

function getSheetTitleFromRange(range) {
  return range.split("!")[0]  
}

function getFirstRowInRange(range) {
  var r = /\d+/;
  var colStr = (range.split("!")[1].match(r));
  return parseInt(colStr);
}

function getSheetInSpreadsheet(spreadsheet, sheetTitle) {
  for (var i=0; i<spreadsheet.sheets.length; i++) {
    if (sheetTitle == spreadsheet.sheets[i].title) {
      return spreadsheet.sheets[i];
    }
  }  
  return null;
}

// {
//   "range": "Sheet1!A1:E1",
//   "majorDimension": "ROWS",
//   "values": [
//     ["Door", "$15", "2", "3/15/2016"],
//     ["Engine", "$100", "1", "3/20/2016"],
//   ],
// }

function prepareAppendRequestBody(dataObject, sheetDoc) {
  var appendReq = { };
  var range = getGoogleSheetHeaderRange(sheetDoc);
  var row = getGoogleSheetRowValues(dataObject, sheetDoc.columns);
  
  return {
    range: range,
    majorDimension: "ROWS",
    "values": [ row ]
  }
}

function detectNewColumns(dataObject, sheetDoc) {
  var fields = Object.keys(dataObject).filter(isUserField);
  var currentCols = sheetDoc.columns.filter(isUserField);
  
  var newFields = [ ];
  
  for (var i=0; i<fields.length; i++) {
    var field = fields[i];
    
    for (var j=0; j<currentCols.length; j++) {
      if (field == currentCols[i]) {
        newFields.push(field)
      }
    }
  }
  
  return newFields;
}

function generateNewColumnBatchUpdates(newCols) {
  
}

function doesSheetExist(sheetTitle, spreadsheetDoc) {
  for (var i=0; i<spreadsheetDoc.sheets; i++) {
    if (sheetTitle == spreadsheetDoc.sheets[i].title) {
      return true;
    }
  } 
  return false;
}

function isUserField(fieldName) {
  return !field.startsWith("_");
}

function getGoogleSheetHeaderRange(sheetDoc) {
  var startRange = `${translateColumnToLetter(0)}1`;
  var endRange = `${translateColumnToLetter(sheetDoc.columns.length-1)}1`;
  return `${sheetDoc.title}!${startRange}:${endRange}`;
}

function getGoogleSheetRowValues(dataObject, columnNames) {
  var row = [ ];
  for (var i=0; i<columnNames.length; i++) {
    var val = dataObject[columnNames[i]];
    if (val == undefined) {
      // object does not have the key, we want Sheets to keep existing value of column
      row.push(null);
    } else if (val == null || val == "") {
      // object has key but it has no value, we want Sheets to clear the value of the column
      row.push("");
    } else {
      row.push(val);
    }
  }
  return row;
}

function translateColumnToLetter(colIndex) {
  var alphabet = [ "a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z" ];
  var overflowChar ="";
  var overflow = Math.floor(colIndex / alphabet.length);
  if (overflow > 0) {
    overflowChar = alphabet[overflow].toUpperCase();
  }
  var mod = colIndex % alphabet.length;
  return `${overflowChar}${alphabet[mod].toUpperCase()}`
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
        "_row": (i+1) 
      };
      for (var j = 0; j < cols.length; j++) {
        doc[cols[j]] = data[i][j]
      }
      docs.push(doc)
    }
  }
  return { cols: cols, docs: docs }
}

function updateSheetDoc(sheet, docs) {
  var preview = {}
  if (docs.docs.length > 0) {
    preview = docs.docs[0]
  } 
  sheet.preview = preview;
  sheet.columns = docs.cols;
  sheet.nrows = docs.docs.length;
  sheet.ncols = docs.cols.length;
  sheet.ncells = (docs.docs.length * docs.cols.length);
  sheet.updated_at = new Date();
  return sheet
}

module.exports = {
  createMetadataFromGoogleSpreadsheet,
  updateSpreadsheetCountsFromSheets,
  createDataObjectsFromUpdatedData,
  getSheetInSpreadsheet,
  prepareAppendRequestBody,
  detectNewColumns,
  generateNewColumnBatchUpdates,
  constructDocs,
  updateSheetDoc
}

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
