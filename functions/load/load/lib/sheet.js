const { constructDocs } = require('./sheetutil')
const { fetchDocsData, compressGoogleDocContent } = require('./docs')
const { fetchImages } = require('./images')
const { constructSheetSchema } = require('./schema')
const { convertValues } = require('./convert')

async function loadSheet(ctx, sheet) {
  let metadata = ctx.state.metadata
  let datatypes = metadata.config && metadata.config.datatypes || { }
  let { cols, docs, excluded } = await fetchData(ctx, metadata, sheet)
  convertValues(cols, docs, datatypes, {
    tz: metadata.tz,
    locale: metadata.locale
  })
  let schema = constructSheetSchema(cols, docs, datatypes)
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
  await fetchImages(ctx.state.docsapi, metadata, cols, docs)
  await compressGoogleDocContent(metadata, docs)
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

function getLoadMode(metadata) {
  return metadata.config && metadata.config.mode || 'UNFORMATTED' 
}

module.exports = {
  loadSheet,
  fetchData,
  fetchSheetData
}