
async function updateHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let body = ctx.event.body
  let metadata = null
  try {
    metadata = await findMetadata(db, id)
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  }
  if (!metadata) {
    ctx.response.httperror(404, `Could not find metadata with id ${id}`)
    return
  }
  if (metadata.created_by_org && metadata.created_by_org != user.org) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  if (!metadata.created_by_org && metadata.created_by != user.userid) {
    // if there is no org (gmail.com) then it has to be the author
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  try {
    Object.assign(metadata, body)
    // TODO, we do not update updated_at* fields because
    // those currently are interpreted as last loaded by load
    let res = await saveMetadata(db, metadata, user)
    let updated = await findMetadata(db, metadata.id)
    ctx.response.json(updated)
    return
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Failed to update metadata for ${id}`, { expose: true })
    return
  }
}

function userInfo(ctx) {
  let auth = ctx.state.auth
  if (!auth || !auth.success) {
    return null
  }
  let decoded = ctx.state.auth.decoded
  let userid = `google-oauth2|${decoded.sub}`
  let email = decoded.email && decoded.email.toLowerCase() || null
  let org = getOrgFromEmail(email)
  return { userid, email, org }
}

function getOrgFromEmail(email) {
  if (!email || email.endsWith("@gmail.com")) return null
  return email.split('@')[1]
}

async function saveMetadata(db, metadata) {
  let id = metadata.id
  return await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
}

async function findMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}

module.exports = {
  updateHandler,
  findMetadata,
  saveMetadata
}