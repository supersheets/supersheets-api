let uuidV4 = require('uuid/v4')
let { startStatus, errorStatus } = require('./status')
const FUNCTION_LOAD = "supersheets-api-v3-loader"
//const FUNCTION_LOAD = "external-test-loader"

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
    ctx.logger.error(err)
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  }
  if (!metadata) {
    // That means a sheet with this id does not exist and therefore 
    // this is being loaded for the first time
    metadata = { id, "_new": true }
  }
  if (metadata.created_by_org && metadata.created_by_org != user.org) {
    ctx.response.httperror(401, 'Unauthorized')
    return
  }

  let statusuuid = uuidV4()
  let datauuid = uuidV4()
  let status = null
  let t = Date.now()
  let dryrun = (invocationType(ctx) == "DryRun")
  try {
    status = await startStatus(db, metadata, user, { uuid: statusuuid, datauuid, dryrun })
  } catch (err) {
    ctx.logger.error(err)
    ctx.response.httperror(500, `Error creating load status for sheet ${metadata.id}`, { expose: true })
    return
  }
  let payload = createPayload(ctx, metadata, status, user)
  let params = {
    InvocationType: invocationType(ctx),
    FunctionName: FUNCTION_LOAD, 
    Qualifier: ctx.env.lambdaAlias || "$LATEST",
    Payload: JSON.stringify(payload)
  }
  ctx.state.lambdaparams = params // we store in state simply so we can expose to unit tests 
  ctx.logger.info(`Lambda Invocation Params: ${JSON.stringify(params, null, 2)}`)
  try {
    let data = await ctx.state.invokelambda(params)
    if (!data) {
      throw new Error("Lambda invocation request failed.")
    }
    if (data.FunctionError && data.FunctionError == "Handled") {
      // Handled - The runtime caught an error thrown by the function and formatted it into a JSON document.
      throw new Error(`Lambda invocation returned an handled error: ${JSON.stringify(data)}`)
    }
    if (data.FunctionError && data.FunctionError == "Unhandled") {
      // Unhandled - The runtime didn't handle the error. For example, the function ran out of memory or timed out.
      throw new Error(`Lambda invocation threw an unhandled error: ${JSON.stringify(data)}`)
    }
    if (data.StatusCode == 202 || data.StatusCode == 204) {
      ctx.response.json(status)
      return
    }
  } catch (err) {
    await errorStatus(db, metadata, user, status.uuid, err, Date.now() - t)
    ctx.logger.error(err)
    ctx.response.httperror(500, `Failed to invoke load function: ${err.message}`, { expose: true })
    return
  }
}

function invocationType(ctx) {
  if (ctx.event.queryStringParameters && ctx.event.queryStringParameters['dryrun']) {
    let val = ctx.event.queryStringParameters['dryrun']
    return val == "true" && "DryRun" || "Event"
  }  
  return "Event"
}

function createPayload(ctx, metadata, status, user) {
  let headers = Object.assign({ "Content-Type": "application/json", "x-cold-start": "true" }, ctx.state.correlation)
  let env = Object.assign({ }, ctx.env, { "FUNC_MONGODB_CACHE_CONNECTION": "false" })
  let token = getIDPAuthorizationToken(ctx)
  return { 
    stageVariables: env,
    headers,
    body: JSON.stringify({
      user,
      spreadsheetid: metadata.id,
      statusid: status.uuid,
      token
    })
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
  let idptoken = getIDPAuthorizationToken(ctx)
  return { userid, email, org, idptoken }
}

function getOrgFromEmail(email) {
  if (!email || email.endsWith("@gmail.com")) return null
  return email.split('@')[1]
}

function getIDPAuthorizationToken(ctx) {
  return ctx.event && ctx.event.body && ctx.event.body.token || null
}



module.exports = {
  loadHandler
}
