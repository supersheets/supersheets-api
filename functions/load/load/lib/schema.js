const allkeys = require('all-object-keys')


/**
 * Metadata Level Schema Construction
 */

function constructSchema(metadata) {
  let columns = mergeSheetSchemaColumns(metadata.sheets.map(sheet => sheet.schema.columns))
  let docs = mergeSheetSchemaDocs(metadata.sheets.map(sheet => sheet.schema.docs))
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
    columns.push({
      name: col,
      datatype: datatypes[col] || "String",
      sample: samples[col]
    })
    if (datatypes[col] == "GoogleDoc" && docSchemas[col]) {
      let docSchema = docSchemas[col]
      for (let field of docSchema.fields) {
        columns.push({
          name: `${col}.${field.name}`,
          datatype: field.datatype,
          sample: field.sample
        })
      }
    }
  }
  return { columns, docs: docSchemas }
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
      let fields = allkeys(obj)
      for (let name of fields) {
        let full = `${col}.${name}`
        if (!index[full]) {
          let c = {
            name,
            datatype: datatypes[full] || "String",
            sample: obj[name] || null
          }
          schemas[col].fields.push(c)
          index[full] = c
        } else if (!index[full].sample) {
          index[full].sample = c.sample
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

module.exports = {
  constructSchema,
  mergeSheetSchemaColumns,
  mergeSheetSchemaDocs,
  constructSheetSchema,
  constructDocSchemas
}