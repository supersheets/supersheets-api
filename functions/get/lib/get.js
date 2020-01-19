async function getHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let db = ctx.state.mongodb
  let id = ctx.event.pathParameters.spreadsheetid
  let metadata = null
  try {
    metadata = await getMetadata(db, id)
  } catch (err) {
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  } 
  if (!metadata) {
    ctx.response.httperror(404, `Could not find metadata with id ${id}`)
    return
  }
  if (metadata.created_by_org && metadata.created_by_org != user.org) {
    // if there is a org then it has to match the user's
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  if (!metadata.created_by_org && metadata.created_by != user.userid) {
    // if there is no org (gmail.com) then it has to be the author
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  ctx.response.json(metadata)
  return
}

async function getMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
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

module.exports = {
  getHandler,
  getMetadata
}