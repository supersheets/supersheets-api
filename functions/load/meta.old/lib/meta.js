
const uuidV4 = require('uuid/v4')
const IGNORE_PREFIX = "_"

async function fetchServiceToken(ctx, next) {
  let key = ctx.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH
  ctx.logger.info(`FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH: ${key}`)
  ctx.state.servicetoken = (await ctx.state.paramstore.getParameter(key)).Value
  ctx.logger.info(`Google Service Token: ${ctx.state.servicetoken}`)
  await next()
}

async function metaHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let current = null
  try {
    current = await findMetadata(db, id)
  } catch (err) {
    ctx.response.httperror(500, `Failed finding metadata for ${id}`, { expose: true })
    return
  }
  if (current && current.created_by_org && current.created_by_org != user.org) {
    // Some other org has already loaded this id
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  //let access = current && getAccess(current) || ctx.event.queryStringParameters.access || 'public'
  // let idptoken = ctx.event.queryStringParameters.idptoken
  let idptoken = ctx.state.servicetoken
  let metadata = null
  try {
    let options = Object.assign({ }, ctx.env, { idptoken })
    metadata = await fetchMetadata(ctx.state.axios, ctx.event.pathParameters.spreadsheetid, options) 
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
  //let url = `${options.GOOGLESHEETS_BASE_URL}/${id}?key=${options.GOOGLESHEETS_API_KEY}`
  let url = `${options.GOOGLESHEETS_BASE_URL}/${id}`
  let headers = { }
  if (options.idptoken) {
    headers['Authorization'] = `Bearer ${options.idptoken}`
  }
  // if (options.access == 'private' && options.idptoken) {
  //   headers['Authorization'] = `Bearer ${options.idptoken}`
  // }
  let doc = (await axios.get(url, { headers })).data
  return createMetadataFromGoogleSpreadsheet(doc)
}

async function createMetadata(db, metadata, user) {
  metadata.uuid = uuidV4()
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
  metadataDoc.sheets = sheets;
  return metadataDoc;
}

// function getAccess(metadata) {
//   return metadata.config && metadata.config.access || null
// }

module.exports = {
  fetchServiceToken,
  metaHandler,
  fetchMetadata,
  updateMetadata,
  createMetadataFromGoogleSpreadsheet
}