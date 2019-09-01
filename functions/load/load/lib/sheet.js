const {
  constructDocs,
} = require('./sheetutil')

const {
  isGoogleDoc,
  extractData
} = require('./docutil')

const {
  constructSheetSchema,
} = require('./schema')

const {
  convertValues
} = require('./convert')

async function loadSheet(ctx, sheet) {
  let metadata = ctx.state.metadata
  let datatypes = metadata.config && metadata.config.datatypes || { }
  let { cols, docs } = await fetchData(ctx, metadata, sheet)
  convertValues(cols, docs, datatypes)
  let schema = constructSheetSchema(cols, docs, datatypes)
  sheet.cols = cols
  sheet.docs = docs
  sheet.schema = schema
  sheet.ncols = cols.length
  sheet.nrows = docs.length
  return sheet
}

async function fetchData(ctx, metadata, sheet) {
  let { cols, docs } = await fetchSheetData(ctx.state.sheetsapi, metadata.id, sheet, { mode: getLoadMode(metadata) })
  if (hasGoogleDocDataTypes(metadata)) {
    let doccols = filterGoogleDocColumns(metadata, cols)
    await fetchDocsData(ctx.state.docsapi, doccols, docs)
  }
  return { cols, docs }
}

async function fetchSheetData(axios, id, sheet, options) {
  options = options || { }
  mode = options.mode || "FORMATTED"
  let params = { valueRenderOption: 'FORMATTED_VALUE' }
  if (mode == 'UNFORMATTED') {
    params.valueRenderOption = 'UNFORMATTED_VALUE'
    params.dateTimeRenderOption = 'SERIAL_NUMBER'
  }
  let data = (await axios.get(`${id}/values/${encodeURIComponent(sheet.title)}`, { params })).data
  return constructDocs(sheet, data.values)
}

async function fetchDocsData(axios, cols, docs) {
  for (let doc of docs) {
    for (let col of cols) {
      if (doc[col] && isGoogleDoc(doc[col])) {
        doc[col] = await fetchDoc(axios, doc[col])
      }
    }
  }
}

async function fetchDoc(axios, url) {
  let docid = isGoogleDoc(url)
  if (!docid) {
    throw new Error(`Invalid Google Doc URL: ${url}`)
  }
  let doc = (await axios.get(`${docid}`)).data
  return extractData(doc)
}

function getLoadMode(metadata) {
  return metadata.config && metadata.config.mode || 'FORMATTED'
}

function hasDataTypes(metadata) {
  return metadata && metadata.config && metadata.config.datatypes || null
}

function hasGoogleDocDataTypes(metadata) {
  if (!hasDataTypes(metadata)) return false
  let datatypes = metadata.config.datatypes
  for (let col in datatypes) {
    if (datatypes[col] == "GoogleDoc") return true
  }
  return false
}

function filterGoogleDocColumns(metadata, cols) {
  let datatypes = metadata.config && metadata.config.datatypes || { }
  return cols.filter(col => datatypes[col] == "GoogleDoc")
}

module.exports = {
  loadSheet,
  fetchData,
  fetchSheetData,
  fetchDocsData,
  fetchDoc
}