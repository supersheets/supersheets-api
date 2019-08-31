const { updateStatus, completeStatus, errorStatus } = require('./status')
const sheetutil = require('./sheetutil')
const docutil = require('./doc')

// PRIMARY HANDLER 
// Basically two important responsibilities
// - Fetch all data and load into the data collectoin (mongodb)
// - Update ctx.state.metadata (memory) with updated sheet and schema information from the load
// 
// How this works:

// For each sheet
// - call sheet handler 
// - load docs into the new collection
// - update the status with progress
// get final counts from all sheets
// construct overall schema from all sheet schemas
// DONE! the parent handlers will save metadata and complete the status object
async function loadHandler(ctx) {
  let t = Date.now()
  let db = ctx.state.mongodb
  let metadata = ctx.state.metadata
  let status = ctx.state.status
  let user = ctx.state.user
  let old_datauuid = status.sheet_current_datauuid || metadata.id
  let new_datauuid = status.sheet_new_datauuid

  
  // LOAD EACH SHEET
  
  if (metadata.schema && metadata.schema.docs) {
    // clear the old doc schemas since we will regenerate
    // as sheets load below
    metadata.schema.docs = { }
  }
  let sheets = [ ]
  if (metadata.sheets) {
    for (sheet of metadata.sheets) {
      let loaded = await sheetHandler(ctx, sheet, new_datauuid)
      sheets.push(loaded)
      await updateStatus(db, status, sheet)
      ctx.logger.info(`Loaded sheet: ${loaded.title}`)
    }
  }
  metadata.sheets = sheets
  
  // UPDATE METADATA
  try {
    sheetutil.updateSpreadsheetCountsFromSheets(metadata)
    sheetutil.updateSchema(metadata)
    metadata.datauuid = new_datauuid
    await updateSpreadsheetMeta(db, metadata)
    ctx.logger.info(`Updated metadata: id=${metadata.id} uuid=${metadata.uuid} datauuid=${metadata.datauuid}`)
    if (old_datauuid) {
      try {
        await db.collection(old_datauuid).drop()
      } catch (err) {
        // Will throw if collection olddatauuid does not exist
        console.warn(`Could not drop collection ${old_datauuid} ${err.message}`)
      }
    }
    await completeStatus(db, status)
    ctx.logger.info(`Completed status: uuid=${status.uuid}`)
    metadata = await db.collection('spreadsheets').findOne({ id: metadata.id })
    return { metadata }
  } catch (err) {
    await errorStatus(db, status, err)
    throw err
  }
}

async function sheetHandler(ctx, sheet, new_datauuid) {
  let metadata = ctx.state.metadata
  let user = ctx.state.user
  let axiossheets = ctx.state.sheets
  let axiosdocs = ctx.state.docs
  let db = ctx.state.mongodb
  let mode = sheetutil.getLoadMode(metadata)
  // Ignore access because we always pass the service token for now
  // which should work for both public sheets and private sheets that have added the service account
  // let access = sheetutil.getAccess(metadata)
  // right now this token doesn't have the proper scope
  // Basically, we always include the service account google oauth token
  // let authorization = user.idptoken || null 
  let authorization = ctx.state.servicetoken || null 
  ctx.logger.info(`Loading ${sheet.title}, mode=${mode}`)
  let sheetdata = await fetchSheetData(axiossheets, metadata.id, sheet.title, { mode, authorization })
  let docs = sheetutil.constructDocs(sheet, sheetdata.values)
  if (mode == "UNFORMATTED" && hasDataTypes(metadata)) {
    sheetutil.convertValues(docs.cols, docs.docs, metadata.config.datatypes, {
      tz: metadata.tz,
      locale: metadata.locale
    })
  }
  if (mode == "UNFORMATTED" && hasGoogleDocDataTypes(metadata)) {
    await docutil.convertValues(docs.cols, docs.docs, metadata.config.datatypes, { 
      axios: axiosdocs,
      idptoken: authorization
    })
    let schemas = docutil.createGoogleDocSchemas(docs.docs, metadata.config.datatypes)
    sheetutil.updateGoogleDocSchemas(metadata, schemas)
  }
  sheetutil.updateSheetDoc(sheet, docs)
  await insertSheetDocs(db, new_datauuid, docs)
  return sheet
}

async function fetchSheetData(axios, id, title, options) {
  options = options || { }
  mode = options.mode || "FORMATTED"
  // access = options.access || 'public'
  let params = { valueRenderOption: 'FORMATTED_VALUE' }
  if (mode == 'UNFORMATTED') {
    params = {
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    }
  }
  let headers = { }
  if (options.authorization) {
    headers['Authorization'] =`Bearer ${options.authorization}`
  }
  // if (access == 'private' && options.authorization) {
  //   headers['Authorization'] = `Bearer ${options.authorization}`
  // }
  return (await axios.get(`${id}/values/${encodeURIComponent(title)}`, { params, headers })).data
}

async function insertSheetDocs(db, datauuid, docs) {
  return await db.collection(datauuid).insertMany(docs.docs, { w: 1 })
}

async function updateSpreadsheetMeta(db, metadata) {
  var query = { id: metadata.id }
  var update = { "$set": metadata }
  var options = { w: 1 }
  await db.collection('spreadsheets').updateOne(query, update, options)
}

function hasDataTypes(metadata) {
  return metadata && metadata.config && metadata.config.datatypes
}

function hasGoogleDocDataTypes(metadata) {
  if (!hasDataTypes(metadata)) return false
  let datatypes = metadata.config.datatypes
  for (let col in datatypes) {
    if (datatypes[col] == "GoogleDoc") return true
  }
  return false
}

module.exports = {
  loadHandler,
  fetchSheetData,
}