async function statusHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let uuid = ctx.event.pathParameters.statusid
  let db = ctx.state.mongodb
  let status = null
  try {
    status = await findStatus(db, uuid)
  } catch (err) {
    ctx.response.httperror(500, `Failed finding load status for ${uuid}`, { expose: true })
    return
  }
  if (!status) {
    ctx.response.httperror(404, `Load status ${uuid} does not exist`, { expose: true })
    return
  }
  if (status.created_by_org && status.created_by_org != user.org) {
    // Status for a spreadsheet the user doesn't have access to
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  ctx.response.json(status)
  return
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

async function findStatus(db, uuid) {
  return await db.collection('status').findOne({ uuid })
}

module.exports = {
  statusHandler
}