const { progressStatus } = require('./status')
const { loadSheet } = require('./sheet')
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
    for (let s of metadata.sheets) {
      ctx.logger.info(`Loading sheet: ${s.title}`)
      let { sheet, docs } = await loadSheet(ctx, s)
      await insertDocs(db, new_datauuid, docs)
      await progressStatus(db, status, sheet)
      sheets.push(sheet)
      ctx.logger.info(`Finished loading sheet: ${sheet.title}`)
    }
  }
  metadata.sheets = sheets
  metadata.datauuid = new_datauuid
  await dropCollection(db, old_datauuid)
  ctx.state.metadata = metadata 
  ctx.logger.info(`Finished loading metadata sheets: id=${metadata.id} uuid=${metadata.uuid} datauuid=${metadata.datauuid}`)
  return
}

async function insertDocs(db, collection, docs) {
  if (!docs || docs.length == 0) return
  return await db.collection(collection).insertMany(docs, { w: 1 })
}

async function dropCollection(db, collection) {
  if (!collection) return
  try {
    await db.collection(collection).drop()
  } catch (err) {
    console.warn(`Could not drop collection ${collection} ${err.message}`)
  }
}

module.exports = {
  loadHandler
}