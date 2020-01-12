async function sheetsHandler(ctx) {
  let user = userInfo(ctx)
  if (!user) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }
  let db = ctx.state.mongodb
  ctx.response.json(await getSheetsForOrg(db, user))
  return
}

// Hack: For now we just return all sheets in the db! Meta doesn't store
// any info about the org or the creater/updater of the sheet.
async function getSheetsForOrg(db, user) {
  let query = getQuery(user)
  let options = {
    sort: [ [ 'title', 1 ] ],
    projection: { id: 1, title: 1, updated_at: 1, uuid: 1, nrows: 1, updated_by: 1 }
  }
  return await db.collection('spreadsheets').find(query, options).toArray()
}

function getQuery(user) {
  let query = { }
  if (!user.org) {
    // just get sheets the user is the creator of
    query = { "created_by": user.userid }
  } else if (user.org == "goalbookapp.com") {
    // match on goalbookapp.com and 
    query = {
      "$or": [ 
        { "created_by_org": user.org }, 
        { "created_by_org": { "$exists": false } } 
      ]
    }
  } else {
    // match only on user.org
    query = { "created_by_org": user.org }
  }
  return query
}

// Auth0 stores ids as google-oauth2|112351329441324368112
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
  sheetsHandler,
  getSheetsForOrg
}