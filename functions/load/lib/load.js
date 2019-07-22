let uuidV4 = require('uuid/v4')
let sheetutil = require('./sheetutil')

async function loadHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let metadata = null
  try {
    metadata = await db.collection('spreadsheets').findOne({ id })
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  }
  if (metadata.created_by_org && metadata.created_by_org != user.org) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let datauuid = uuidV4()
  let sheet = null
  let sheets = [ ]
  try {
    if (metadata.sheets) {
      for (sheet of metadata.sheets) {
        sheets.push(await sheetHandler(ctx, db, metadata, sheet, datauuid))
      }
    }
    metadata.sheets = sheets
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Error loading sheet ${sheet.title}: ${err.message}`, { expose: true })
    return
  }
  let olddatauuid = metadata.datauuid || metadata.id
  try {
    sheetutil.updateSpreadsheetCountsFromSheets(metadata)
    sheetutil.updateSchema(metadata)
    metadata.datauuid = datauuid
    await updateSpreadsheetMeta(db, id, metadata)
    
    if (olddatauuid) {
      try {
        await db.collection(olddatauuid).drop()
      } catch (err) {
        // Will throw if collection olddatauuid does not exist
        ctx.logger.warn(`Could not drop collection ${olddatauuid} ${err.message}`)
      }
    }
    metadata = await db.collection('spreadsheets').findOne({ id })
    ctx.response.json(metadata)
    return
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Failed to save metadata for ${metadata.id}`, { expose: true })
    return
  }
}

async function sheetHandler(ctx, db, metadata, sheet, datauuid) {
  let id = metadata.id
  let mode = sheetutil.getLoadMode(metadata)
  let access = sheetutil.getAccess(metadata)
  let authorization = getIDPAuthorizationToken(ctx)
  ctx.logger.info(`Loading ${sheet.title}, mode=${mode}`)
  let sheetdata = await fetchSheetData(ctx.state.axios, id, sheet.title, { mode, access, authorization })
  let docs = sheetutil.constructDocs(sheet, sheetdata.values)
  if (mode == "UNFORMATTED" && metadata.config && metadata.config.datatypes) {
    sheetutil.convertValues(docs.cols, docs.docs, metadata.config.datatypes, {
      tz: metadata.tz,
      locale: metadata.locale
    })
  }
  sheetutil.updateSheetDoc(sheet, docs)

  // We don't replace the collection 
  // await reloadSheetDocs(db, id, sheet.title, docs)
  // We insert into a new one 
  await insertSheetDocs(db, datauuid, docs)
  //await updateSheetMeta(db, id, sheet, datauuid)
  // return docs
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

async function updateSpreadsheetMeta(db, id, metadata) {
  var query = { id }
  var update = { "$set": metadata }
  var options = { w: 1 }
  await db.collection('spreadsheets').updateOne(query, update, options)
}

function userInfo(ctx) {
  let auth = ctx.state.auth
  if (!auth || !auth.success) {
    return null
  }
  let decoded = ctx.state.auth.decoded
  let userid = decoded.sub
  let email = decoded.email && decoded.email.toLowerCase() || null
  let org = getOrgFromEmail(email)
  return { userid, email, org }
}

function getOrgFromEmail(email) {
  if (!email || email.endsWith("@gmail.com")) return null
  return email.split('@')[1]
}

function getIDPAuthorizationToken(ctx) {
  return ctx.event.queryStringParameters && ctx.event.queryStringParameters['idptoken'] || null
}

module.exports = {
  loadHandler,
  fetchSheetData
}

// async function reloadSheetDocs(db, id, title, docs) {
//   await db.collection(id).deleteMany({ "_sheet": title})
//   return await db.collection(id).insertMany(docs.docs, { w: 1 })
// }

// async function updateSheetMeta(db, id, sheet) {
//   let query = {
//     id: id,
//     "sheets.title": sheet.title
//   }
//   let update = { "$set": { "sheets.$": sheet } }
//   return await db.collection('spreadsheets').updateOne(query, update, { w: 1 })
// }