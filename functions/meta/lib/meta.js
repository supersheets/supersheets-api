
const uuidV4 = require('uuid/v4')

async function metaHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let current = await findMetadata(db, id)
  let metadata = null
  try {
    metadata = await fetchMetadata(ctx.state.axios, ctx.event.pathParameters.spreadsheetid, ctx.env) 
  } catch (err) {
    ctx.response.httperror(404, `Google Spreadsheet ${id} could not be found.`) 
    return
  }
  try {
    let saved = null
    if (current) {
      metadata = Object.assign(current, metadata)
      saved = await updateMetadata(db, metadata, user)
    } else {
      saved = await createMetadata(db, metadata, user)
    }
    ctx.response.json(saved)
    return
  } catch (err) {
    ctx.response.httperror(500, `Failed to save metadata for ${metadata.id}`, { expose: true })
    return
  }
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

async function fetchMetadata(axios, id, options) {
  let url = `${options.GOOGLESHEETS_BASE_URL}/${id}?key=${options.GOOGLESHEETS_API_KEY}`
  let doc = (await axios.get(url)).data
  return createMetadataFromGoogleSpreadsheet(doc)
}

async function createMetadata(db, metadata, user) {
  metadata.uuid = new uuidV4()
  metadata.created_at = new Date()
  metadata.created_by = user.userid
  metadata.created_by_email = user.email
  metadata.created_by_org = user.org
  await saveMetadata(db, metadata)
  return await findMetadata(db, metadata.id)
}

async function updateMetadata(db, metadata, user) {
  metadata.updated_at = new Date()
  if (user) {
    metadata.updated_by = user.userid
    metadata.updated_by_email = user.email
    metadata.updated_by_org = user.org
  }
  // Old metadata will not have created_* fields
  // So we add them
  if (!metadata.created_at) {
    metadata.created_at = metadata.updated_at
  }
  if (user && !metadata.created_by) {
    metadata.created_by = metadata.updated_by
    metadata.created_by_email = metadata.updated_by_email
    metadata.created_by_org = metadata.updated_by_org
  }
  await saveMetadata(db, metadata)
  return await findMetadata(db, metadata.id)
}

async function saveMetadata(db, metadata) {
  let id = metadata.id
  return await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}

async function findMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}

function createMetadataFromGoogleSpreadsheet(doc) {
  let metadataDoc = {
    id: doc.spreadsheetId,
    url: doc.spreadsheetUrl,
    title: doc.properties.title,
    tz: doc.properties.timeZone,
    local: doc.properties.locale
  }
  let sheets = [ ];
  
  for (var i=0; i<doc.sheets.length; i++) {
    let sheetDoc = doc.sheets[i].properties; 
    sheets.push({
      id: sheetDoc.sheetId,
      title: sheetDoc.title,
      index: sheetDoc.index,
      sheetType: sheetDoc.sheetType
    })
  }
  metadataDoc.sheets = sheets;
  return metadataDoc;
}


module.exports = {
  metaHandler,
  fetchMetadata,
  updateMetadata,
  createMetadataFromGoogleSpreadsheet
}