const { constructDocs } = require('./sheetutil')
const { fetchDocsData, compressGoogleDocContent } = require('./docs')
const { fetchImages } = require('./images')
const { constructSheetSchema } = require('./schema')
const { convertValues } = require('./convert')

async function loadSheet(ctx, sheet) {
  //let datatypes = metadata.config && metadata.config.datatypes || { }
  // we trick the lower levels into thinking that this particular sheet's
  // config is the entire metadata
  let metadata = createSheetMetadata(ctx.state.metadata, sheet.title)
  let { cols, docs, excluded } = await fetchData(ctx, metadata, sheet)
  convertValues(cols, docs, metadata.config.datatypes, {
    tz: metadata.tz,
    locale: metadata.locale
  })
  let schema = constructSheetSchema(cols, docs, metadata.config)
  schema.excluded = excluded
  sheet.cols = cols
  sheet.schema = schema
  sheet.ncols = cols.length
  sheet.nrows = docs.length
  return { sheet, docs }
}

async function fetchData(ctx, metadata, sheet) {
  let { cols, docs, excluded } = await fetchSheetData(ctx.state.sheetsapi, metadata.id, sheet, { mode: getLoadMode(metadata) })
  await fetchDocsData(ctx.state.docsapi, metadata, cols, docs)
  await fetchImages(ctx, metadata, cols, docs)
  await compressGoogleDocContent(metadata, cols, docs)
  // compress all doc[_content]
  return { cols, docs, excluded }
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

function createSheetMetadata(metadata, title) {
  let config = metadata.config && metadata.config[title] || { }
  config.datatypes = config.datatypes || { }
  return { 
    id: metadata.id, 
    mode: getLoadMode(metadata), 
    config 
  }
}

function getLoadMode(metadata) {
  return metadata.config && metadata.config.mode || 'UNFORMATTED' 
}

module.exports = {
  loadSheet,
  fetchData,
  fetchSheetData
}