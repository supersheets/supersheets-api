const uuidV4 = require('uuid/v4')
const COLLECTION = 'spreadsheets'
const IGNORE_PREFIX = "_"

async function metaHandler(ctx, next) {
  await initOrFindMetadata(ctx)
  await fetchAndMergeMetadata(ctx)
  await next()
  await createOrUpdateMetadata(ctx)
}

async function initOrFindMetadata(ctx) {
  if (ctx.state.metadata) return await next()
  let id = ctx.event.body.spreadsheetid
  if (!id) {
    throw new Error("No Google Spreadsheet Doc ID provided ('ctx.event.body.spreadsheetid')")
  }
  let db = ctx.state.mongodb
  let user = ctx.state.user
  let metadata = await findMetadata(db, id)
  if (metadata) {
    if (metadata.created_by_org && metadata.created_by_org != user.org) {
      throw new Error(`Unauthorized: ${user.email} not does not belong to org ${metadata.created_by_org}`)
    }
  } 
  if (!metadata) {
    metadata = { "_new": true }
  }
  ctx.state.metadata = metadata
  return
}

async function fetchAndMergeMetadata(ctx) {
  let id = ctx.event.body.spreadsheetid
  let doc = (await ctx.state.sheetsapi.get(id)).data
  let latest = createMetadataFromGoogleSpreadsheet(doc)
  Object.assign(ctx.state.metadata, latest)
}

function createMetadataFromGoogleSpreadsheet(doc) {
  let metadata = {
    id: doc.spreadsheetId,
    url: doc.spreadsheetUrl,
    title: doc.properties.title,
    tz: doc.properties.timeZone,
    local: doc.properties.locale, // TYPO but keep things backward compatible
    locale: doc.properties.locale
  }
  let sheets = [ ]
  
  for (var i=0; i<doc.sheets.length; i++) {
    let sheetDoc = doc.sheets[i].properties
    if (!sheetDoc.title.startsWith(IGNORE_PREFIX)) {
      sheets.push({
        id: sheetDoc.sheetId,
        title: sheetDoc.title,
        index: sheetDoc.index,
        sheetType: sheetDoc.sheetType
      })
    }
  }
  metadata.sheets = sheets
  return metadata
}

async function createOrUpdateMetadata(ctx) {
  let user = ctx.state.user
  let metadata = ctx.state.metadata
  let db = ctx.state.mongodb
  if (metadata["_new"]) {
    Object.assign(metadata, metadataCreateFields(user))
    delete metadata["_new"]
  } else {
    if (!metadata.created_at) {
      // Old v1 metadata will not have created_* fields
      Object.assign(metadata, metadataCreateFields(user))
    }
    Object.assign(metadata, metadataUpdateFields(user))
  }
  await saveMetadata(db, metadata)
  ctx.state.metadata = await findMetadata(db, metadata.id)
  return
}

function metadataCreateFields(user) {
  return {
    created_at: new Date(),
    created_by: user.userid,
    created_by_email: user.email,
    created_by_org: user.org
  }
}

function metadataUpdateFields(user) {
  return {
    updated_at: new Date(),
    updated_by: user.userid,
    updated_by_email: user.email,
    updated_by_org: user.org
  }
}

async function findMetadata(db, id) {
  return await db.collection(COLLECTION).findOne({ id })
}

async function saveMetadata(db, metadata) {
  let id = metadata.id
  return await db.collection(COLLECTION).updateOne({ id }, { "$set": metadata }, { upsert: true, w: 1 })
}

// unit testing only
async function deleteMetadata(db, id) {
  return await db.collection(COLLECTION).deleteOne({ id })
}

module.exports = {
  metaHandler,
  initOrFindMetadata,
  createOrUpdateMetadata,
  fetchAndMergeMetadata,
  createMetadataFromGoogleSpreadsheet,
  findMetadata,
  saveMetadata,
  deleteMetadata
}