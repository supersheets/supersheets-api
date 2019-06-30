let sheetutil = require('./sheetutil')

async function loadHandler(ctx) {
  const db = ctx.state.mongodb
  let id = ctx.event.pathParameters && ctx.event.pathParameters.spreadsheetid
  let spreadsheet = await db.collection('spreadsheets').findOne({ id })
  for (let sheet of spreadsheet.sheets) {
    await sheetHandler(ctx, db, id, sheet)
  }
  var values = sheetutil.updateSpreadsheetCountsFromSheets(spreadsheet)
  await updateSpreadsheetMeta(db, id, values)
  ctx.response.json(spreadsheet)
  return
}

async function sheetHandler(ctx, db, id, sheet) {
  ctx.logger.info(`Loading ${sheet.title}`)
  let sheetdata = await fetchSheetData(ctx.state.axios, id, sheet.title)
  let docs = sheetutil.constructDocs(sheet, sheetdata.values)
  sheetutil.updateSheetDoc(sheet, docs)

  await reloadSheetDocs(db, id, sheet.title, docs)
  await updateSheetMeta(db, id, sheet)
  
  return docs
}

async function fetchSheetData(axios, id, title) {
  try {
    return (await axios.get(`${id}/values/${title.trim()}`)).data
  } catch (err) {
    console.error(`Fetching ${title}`)
    console.error(err)
  }
}

async function reloadSheetDocs(db, id, title, docs) {
  await db.collection(id).deleteMany({ "_sheet": title})
  return await db.collection(id).insertMany(docs.docs, { w: 1 })
}

async function updateSheetMeta(db, id, sheet) {
  let query = {
    id: id,
    "sheets.title": sheet.title
  }
  let update = { "$set": { "sheets.$": sheet } }
  return await db.collection('spreadsheets').updateOne(query, update, { w: 1 })
}

async function updateSpreadsheetMeta(db, id, values) {
  var query = { id }
  var update = { "$set": values }
  var options = { w: 1 }
  await db.collection('spreadsheets').updateOne(query, update, options)
}

module.exports = {
  loadHandler
}