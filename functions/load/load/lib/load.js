const axios = require('axios')
const { updateStatus, completeStatus, errorStatus } = require('./status')
const sheetutil = require('./sheetutil')
const docutil = require('./doc')

// CUSTOM MIDDLEWARE 
async function setGoogle(ctx, next) {
  if (!ctx.state.sheets) {
    ctx.state.sheets = axios.create({
      baseURL: ctx.env.GOOGLESHEETS_BASE_URL,
      params: {
        key: ctx.env.GOOGLESHEETS_API_KEY
      }
    })
  } 
  if (!ctx.state.docs) {
    ctx.state.docs = axios.create({
      baseURL: ctx.env.GOOGLEDOCS_BASE_URL,
      params: {
        key: ctx.env.GOOGLESHEETS_API_KEY
      }
    })
  }
  return await next()
}

async function setUser(ctx, next) {
  if (ctx.state.user) return await next()
  ctx.state.user = ctx.event.body && ctx.event.body.user
  return await next()
}

async function findMetadata(ctx, next) {
  if (ctx.state.metadata) return await next()
  let id = ctx.event.body.spreadsheetid
  let db = ctx.state.mongodb
  ctx.state.metadata = await db.collection('spreadsheets').findOne({ id })
  ctx.logger.info(`Metadata: ${JSON.stringify(ctx.state.metadata, null, 2)}`) // should eventually be debug
  if (!ctx.state.metadata) {
    throw new Error(`Sheet ${id} does not exist`)
  }
  return await next()
}

async function findStatus(ctx, next) {
  if (ctx.state.status) return await next()
  let uuid = ctx.event.body.statusid
  let db = ctx.state.mongodb
  ctx.state.status = await db.collection('status').findOne({ uuid })
  ctx.logger.info(`Status: ${JSON.stringify(ctx.state.status, null, 2)}`) // should eventually be debug
  if (!ctx.state.status) {
    throw new Error(`Status ${uuid} does not exist`)
  }
  return await next()
}

async function fetchServiceToken(ctx, next) {
  let key = ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
  ctx.state.servicetoken = (await ctx.state.paramstore.getParameter(key)).Value
  await next()
}

// PRIMARY HANDLER 

async function loadHandler(ctx) {
  let t = Date.now()
  let db = ctx.state.mongodb
  let metadata = ctx.state.metadata
  let status = ctx.state.status
  let user = ctx.state.user
  let old_datauuid = metadata.datauuid || metadata.id
  let new_datauuid = status.sheet_new_datauuid
  // LOAD EACH SHEET
  try {
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
  } catch (err) {
    await errorStatus(db, status, err)
    ctx.logger.error(err)
    throw err
  }
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
  let access = sheetutil.getAccess(metadata)

  let authorization = ctx.state.servicetoken || null 
  // let authorization = user.idptoken || null // right now this token doesn't have the proper scope
  ctx.logger.info(`Loading ${sheet.title}, mode=${mode}`)
  let sheetdata = await fetchSheetData(axiossheets, metadata.id, sheet.title, { mode, access, authorization })
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
  }
  sheetutil.updateSheetDoc(sheet, docs)
  await insertSheetDocs(db, new_datauuid, docs)
  return sheet
}

async function fetchSheetData(axios, id, title, options) {
  options = options || { }
  mode = options.mode || "FORMATTED"
  access = options.access || 'public'
  let params = { valueRenderOption: 'FORMATTED_VALUE' }
  if (mode == 'UNFORMATTED') {
    params = {
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    }
  }
  let headers = { }
  if (access == 'private' && options.authorization) {
    headers['Authorization'] = `Bearer ${options.authorization}`
  }
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
  setUser,
  setGoogle,
  findMetadata,
  findStatus,
  fetchSheetData,
  loadHandler,
  fetchServiceToken
}