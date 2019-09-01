const IGNORE_PREFIX = "_"
const GRAPHQL_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/

function isValidColumnName(name) {
  return name && !name.startsWith(IGNORE_PREFIX) && name.match(GRAPHQL_NAME_REGEX) && true || false
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
        if (isValidColumnName(column)) {
          doc[cols[j]] = data[i][j]
        }
      }
      docs.push(doc)
    }
  }
  let excluded = cols.filter(name => !isValidColumnName(name))
  cols = cols.filter(name => isValidColumnName(name))
  return { cols, docs, excluded } 
}


module.exports = {
  constructDocs
}

// function getSampleColumnValues(cols, docs) {
//   let samples = { }
//   for (let name of cols) {
//     samples[name] = null
//     for (let doc of docs) {
//       if (doc[name]) {
//         samples[name] = doc[name]
//         break
//       }
//     }
//   }
//   return samples
// }

// function updateSchema(metadata) {
//   let datatypes = metadata.config && metadata.config.mode == "UNFORMATTED" && metadata.config.datatypes || { }
//   if (!metadata.schema) {
//     metadata.schema = { }
//   }
//   metadata.schema.columns = [ ]
//   let schema = metadata.schema
//   let cols = { }
//   for (let sheet of metadata.sheets) {
//     for (let column of sheet.columns) {
//       if (!cols[column]) {
//         schema.columns.push({
//           name: column,
//           datatype: datatypes[column] || "String",
//           sample: sheet.samples[column],
//         })
//         cols[column] = [ sheet.title ]
//       } else {
//         cols[column].push(sheet.title)
//       }
//     }
//   }
//   for (col of schema.columns) {
//     col.sheets = cols[col.name]
//   }
//   // metadata.schema = schema
//   return metadata 
// }

// function updateGoogleDocSchemas(metadata, schemas) {
//   if (!metadata.schema) {
//     metadata.schema = { }
//   }
//   if (!metadata.schema.docs) {
//     metadata.schema.docs = schemas
//     return
//   }
//   for (let col in schemas) {
//     if (metadata.schema.docs[col]) {
//       updateExistingGoogleDocSchema(metadata.schema.docs[col], schemas[col])
//     } else {
//       metadata.schema.docs[col] = schemas[col]
//     }
//   }
// }

// function updateExistingGoogleDocSchema(current, schema) {
//   for (let key of schema.columns) {
//     if (!current.columns.find(k => k.name == key.name)) {
//       current.columns.push(key)
//     }
//   }
// }

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
