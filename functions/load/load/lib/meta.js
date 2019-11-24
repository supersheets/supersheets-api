const uuidV4 = require('uuid/v4')
const COLLECTION = 'spreadsheets'
const IGNORE_PREFIX = "_"
const GRAPHQL_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/

const { constructSchema, updateConfig } = require('./schema')

async function metaHandler(ctx, next) {
  await initOrFindMetadata(ctx)
  await fetchAndMergeMetadata(ctx)
  await next()
  updateSpreadsheetMetadata(ctx)
  await createOrUpdateMetadata(ctx)
}

async function initOrFindMetadata(ctx) {
  if (ctx.state.metadata) return 
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
  } else {
    metadata = initMetadata(id)
  }
  ctx.state.metadata = metadata
  return
}

async function fetchAndMergeMetadata(ctx) {
  let id = ctx.event.body.spreadsheetid
  let doc = null
  try {
    doc = (await ctx.state.sheetsapi.get(id)).data
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      let error = err.response.data.error
      let message = `Error fetching spreadsheet '${id}': ${error.code} ${error.status} ${error.message}`
      throw new Error(message)
    } else {
      throw err
    }
  }
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


// This needs to wait until all Goalbook google sheets use graphql compatible sheet names
// function isValidSheetTitle(title) {
//   return title && !title.startsWith(IGNORE_PREFIX) && title.match(GRAPHQL_NAME_REGEX) && true || false
// }

function updateSpreadsheetMetadata(ctx) {
  let metadata = ctx.state.metadata
  updateSpreadsheetCountsFromSheets(metadata)
  metadata.schema = constructSchema(metadata)
  metadata.config = updateConfig(metadata)
}

async function createOrUpdateMetadata(ctx) {
  let user = ctx.state.user
  let metadata = ctx.state.metadata
  let db = ctx.state.mongodb
  if (!metadata) {
    throw new Error("ctx.state.metadata is null")
  }
  if (metadata["_new"]) {
    Object.assign(metadata, metadataCreateFields(user))
    Object.assign(metadata, metadataUpdateFields(user))
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
  ctx.logger.info(`Saved updated metadata: id=${metadata.id} uuid=${metadata.uuid} datauuid=${metadata.datauuid}`)
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

function initMetadata(id) {
  return { id, "_new": true }
}

async function findMetadata(db, id) {
  return await db.collection(COLLECTION).findOne({ id })
}

async function saveMetadata(db, metadata) {
  let id = metadata.id
  return await db.collection(COLLECTION).updateOne({ id }, { "$set": metadata }, { upsert: true, w: 1 })
}

function updateSpreadsheetCountsFromSheets(metadata) {
  metadata.nrows = 0
  metadata.ncols = 0
  for (let sheet of metadata.sheets) {
    metadata.nrows += (sheet.nrows || 0)
    metadata.ncols += (sheet.ncols || 0)
  }
  return metadata
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