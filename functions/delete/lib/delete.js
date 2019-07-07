async function deleteHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  let metadata = null
  try {
    metadata = await findMetadata(db, id)
  } catch (err) {
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
  try {
    await deleteData(db, id)
    let res = await deleteMetadata(db, id)
    ctx.response.json(res.result)
    return
  } catch (err) {
    ctx.response.httperror(500, `Failed to delete Supersheet ${id}`, { expose: true })
    return
  }
}

async function findMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}

async function deleteMetadata(db, id) {
  return await db.collection('spreadsheets').deleteOne({ id })
}

async function deleteData(db, id) {
  return await db.collection(id).drop()
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
  deleteHandler,
  deleteMetadata,
  deleteData
}