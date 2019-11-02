const DOC_RESERVED_FIELDS = [ "_url", "_docid" ]

/**
 * Metadata Level Schema Construction
 */

function constructSchema(metadata) {
  let columns = mergeSheetSchemaColumns(metadata.sheets.map(sheet => sheet.schema && sheet.schema.columns || [ ]))
  let docs = mergeSheetSchemaDocs(metadata.sheets.map(sheet => sheet.schema && sheet.schema.docs || { }))
  return { columns, docs }
}

function mergeSheetSchemaColumns(schemas) {
  let index = { }
  let merged = [ ]
  for (let columns of schemas) {
    for (let col of columns) {
      if (!index[col.name]) {
        merged.push(col)
        index[col.name] = col
      } else if (!index[col.name].sample) {
        index[col.name].sample = col.sample
      }
    }
  }
  return merged
}

function mergeSheetSchemaDocs(schemas) {
  let index = { }
  let merged = { }
  for (let docs of schemas) {
    for (let col in docs) {
      for (let field of docs[col].fields) {
        let full = `${col}.${field.name}`
        if (!index[full]) {
          if (!merged[col]) {
            merged[col] = { name: col, fields: [ ] }
          }
          merged[col].fields.push(field)
          index[full] = field
        } else if (!index[full].sample) {
          index[full].sample = field.sample
        }
      }
    }
  }
  return merged
}

/**
 * Sheet Level Schema Construction
 */
function constructSheetSchema(cols, docs, datatypes) {
  let doccols = cols.filter(col => datatypes[col] == "GoogleDoc")
  let docSchemas = constructDocSchemas(doccols, docs, datatypes)
  let samples = getSampleColumnValues(cols, docs)
  let columns = [ ]
  for (let col of cols) {
    let column = {
      name: col,
      datatype: datatypes[col] || "String",
      sample: samples[col]
    }
    if (datatypes[col] == "GoogleDoc" && docSchemas[col]) {
      column.fields = docSchemas[col].fields
    }
    columns.push(column)
  }
  let reserved = createdReservedSchemaColumns(docs[0])
  return { columns: reserved.concat(columns), docs: docSchemas }
}

function constructDocSchemas(cols, docs, datatypes) {
  if (cols.length == 0) return { }
  let schemas = { }
  let index = { }
  for (let col of cols) {
    schemas[col] = { 
      name: col,
      fields: [ ]
    }
  }
  for (let doc of docs) {
    for (let col of cols) {
      let obj = doc[col]
      if (!obj || (typeof obj != 'object')) continue
      let fields = Object.getOwnPropertyNames(obj) // allkeys(obj) will traverse StringList array values aka "title.0" bug
      for (let name of fields) {
        let full = `${col}.${name}`
        if (!index[full]) {
          let c = {
            name,
            datatype: datatypes[full] || "String",
            sample: obj[name] || null,
            reserved: DOC_RESERVED_FIELDS.includes(name) || false
          }
          schemas[col].fields.push(c)
          index[full] = c
        } else if (!index[full].sample) {
          index[full].sample = obj[name]
        }
      }
    }
  }
  return schemas
}

function getSampleColumnValues(cols, docs, datatypes) {
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


function createdReservedSchemaColumns(doc) {
  doc = Object.assign({
    "_id": "5d6b2f2f0c6d3f00074ad599",
    "_sheet": "Sheet1",
    "_row": 1,
    "_errors": []
  }, doc)
  return [ {
    name: "_id",
    datatype: "String",
    sample: doc["_id"],
    reserved: true
  }, {
    name: "_sheet",
    datatype: "String",
    sample: doc["_sheet"],
    reserved: true
  }, {
    name: "_row",
    datatype: "Int",
    sample: doc["_row"],
    reserved: true
  }, {
    name: "_errors",
    datatype: "StringList",
    sample: doc["_errors"],
    reserved: true
  } ]
}

function updateConfig(metadata) {
  let config = JSON.parse(JSON.stringify(metadata.config || { mode: "UNFORMATTED", datatypes: { } }))
  config.mode = config.mode || "UNFORMATTED"
  config.datatypes = config.datatypes || { }
  metadata.schema && metadata.schema.columns.filter(col => !col.reserved).forEach(col => {
    if (!config.datatypes[col.name]) {
      config.datatypes[col.name] = col.datatype
    }
  })
  return config
}

module.exports = {
  constructSchema,
  mergeSheetSchemaColumns,
  mergeSheetSchemaDocs,
  constructSheetSchema,
  constructDocSchemas,
  updateConfig
}