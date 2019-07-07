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
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  }
  if (metadata.created_by_org && metadata.created_by_org != user.org) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let sheet = null
  try {
    for (sheet of metadata.sheets) {
      await sheetHandler(ctx, db, id, sheet)
    }
  } catch (err) {
    ctx.response.httperror(500, `Error loading sheet ${sheet.title}: ${err.message}`, { expose: true })
    return
  }
  try {
    var values = sheetutil.updateSpreadsheetCountsFromSheets(metadata)
    await updateSpreadsheetMeta(db, id, values)
    metadata = await db.collection('spreadsheets').findOne({ id })
    ctx.response.json(metadata)
    return
  } catch (err) {
    ctx.response.httperror(500, `Failed to save metadata for ${metadata.id}`, { expose: true })
    return
  }
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
  return (await axios.get(`${id}/values/${title.trim()}`)).data
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

module.exports = {
  loadHandler
}