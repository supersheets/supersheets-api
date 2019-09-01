const { progressStatus } = require('./status')
const { loadSheet } = require('./sheet')
const { constructSchema } = require('./schema')
const COLLECTION = 'spreadsheets'

async function loadHandler(ctx) {
  let db = ctx.state.mongodb
  let metadata = ctx.state.metadata
  let status = ctx.state.status
  let old_datauuid = status.sheet_current_datauuid || metadata.id
  let new_datauuid = status.sheet_new_datauuid
  // LOAD SHEETS
  let sheets = [ ]
  if (metadata.sheets) {
    for (let sheet of metadata.sheets) {
      ctx.logger.info(`Loading sheet: ${sheet.title}`)
      sheet = await loadSheet(ctx, sheet)
      await insertDocs(db, new_datauuid, sheet.docs)
      await progressStatus(db, status, sheet)
      sheets.push(sheet)
      ctx.logger.info(`Finished loading sheet: ${sheet.title}`)
    }
  }
  metadata.sheets = sheets

  // UPDATE METADATA
  updateSpreadsheetCountsFromSheets(metadata)
  metadata.schema = constructSchema(metadata)
  metadata.datauuid = new_datauuid
  await saveMetadata(db, metadata)
  await dropCollection(db, old_datauuid)
  ctx.state.metadata = await findMetadata(db, metadata.id) 
  ctx.logger.info(`Saved updated metadata: id=${metadata.id} uuid=${metadata.uuid} datauuid=${metadata.datauuid}`)
  return
}

async function insertDocs(db, collection, docs) {
  return await db.collection(collection).insertMany(docs, { w: 1 })
}

async function dropCollection(collection) {
  if (!collection) return
  try {
    await db.collection(collection).drop()
  } catch (err) {
    console.warn(`Could not drop collection ${collection} ${err.message}`)
  }
}

async function findMetadata(db, id) {
  return await db.collection(COLLECTION).findOne({ id })
}

async function saveMetadata(db, metadata) {
  metadata.updated_at = new Date()
  var query = { id: metadata.id }
  var update = { "$set": metadata }
  var options = { w: 1 }
  await db.collection(COLLECTION).updateOne(query, update, options)
}

function updateSpreadsheetCountsFromSheets(metadata) {
  metadata.nrows = 0
  metadata.ncols = 0
  for (let sheet of metadata.sheets) {
    metadata.nrows += sheet.nrows
    metadata.ncols += sheet.ncols
  }
  return metadata
}

module.exports = {
  loadHandler
}