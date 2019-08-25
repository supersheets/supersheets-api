const uuidV4 = require('uuid/v4')
const COLLECTION = "status"


async function statusHandler(ctx, next) {
  // lookup the status and set in ctx.state.status
  if (ctx.state.status) return await next()
  let uuid = ctx.event.body && ctx.event.body.statusid
  if (!uuid) {
    throw new Error("No status uuid provided ('ctx.event.body.statusid')")
  }
  if (!ctx.state.mongodb) {
    throw new Error("MongoDB connection not provided ('ctx.state.mongodb')")
  }
  ctx.state.status = await findStatus(ctx.state.mongodb, { uuid })
  ctx.logger.info(`Status: ${JSON.stringify(ctx.state.status, null, 2)}`) // should eventually be debug
  if (!ctx.state.status) {
    throw new Error(`Status ${uuid} does not exist`)
  }
  await next()
  // complete the status
  await completeStatus(ctx.state.mongodb, ctx.state.status)
  return
}

async function errorStatusHandler(ctx, next) {
  ctx.logger.error(`Uncaught Error: ${ctx.error.message}`)
  let uuid = ctx.event && ctx.event.body && ctx.event.body.statusid
  if (!uuid) {
    ctx.logger.error('Cannot update status with error: status uuid is not provided')
    return await next()
  }
  let db = ctx.state.mongodb
  if (!db) {
    ctx.logger.error(`Cannot update status with error: MongoDB not initialized (uuid=${uuid})`)
    return await next()
  }
  let status = ctx.state.status
  if (!status) {
    try {
      status = await findStatus(db, { uuid })
    } catch (err) {
      ctx.logger.error(`Cannot update status with error: could not find status ${err.message} (uuid=${uuid})`)
    }
  }
  try {
    await failStatus(db, status, ctx.error)
  } catch (err) {
    ctx.logger.error(`Cannot update status with error: could not save status ${err.message} (uuid=${uuid})`)
  }
  return await next()
}

async function progressStatus(db, status, sheet) {
  let d = new Date()
  let query = { uuid: status.uuid }
  let update = {
    "$set": { 
      status: "PROGRESS", 
      updated_at: d
    }, 
    "$inc": {
      num_sheets_loaded: 1
    },
    "$push": {
      sheets_loaded: sheet.title
    }
  }
  return await updateStatus(db, query, update)
}

async function completeStatus(db, status) {
  let d = new Date()
  let query = { uuid: status.uuid }
  let update = {
    "$set": { 
      status: "SUCCESS",
      updated_at: d, 
      completed_at: d,
      duration: d.getTime() - status.created_at.getTime()
    }
  }
  return await updateStatus(db, query, update)
}

async function failStatus(db, status, err) {
  let d = new Date()
  let query = { uuid: status.uuid }
  let update =  {
    "$set": {
      status: "FAILURE",
      error: true,
      errorMessage: err.message,
      errorStack: err.stack,
      updated_at: d, 
      completed_at: d,
      duration: d.getTime() - status.created_at.getTime()
    }
  }
  return await updateStatus(db, query, update)
}

async function findStatus(db, query) {
  return await db.collection(COLLECTION).findOne(query)
}

async function updateStatus(db, query, update) {
  return await db.collection(COLLECTION).updateOne(query, update, { upsert: true, w: 1 })
}

// only used for unit testing
async function deleteStatus(db, query) {
  return await db.collection(COLLECTION).deleteOne(query)
}

// STATUS FIELDS:
// uuid: options.uuid || uuidV4(),
// status: "INIT",
// sheet_id: metadata.id,
// sheet_uuid: metadata.uuid,
// sheet_current_datauuid: metadata.datauuid,
// sheet_new_datauuid: options.datauuid,
// num_sheets_loaded: 0,
// num_sheets_total: metadata.sheets.length,
// sheets_loaded: [ ],
// created_at: d,
// created_by: user.userid,
// created_by_email: user.email,
// created_by_org: user.org,
// updated_at: d,
// updated_by: user.userid,
// updated_by_email: user.email,
// updated_by_org: user.org,
// error: null


module.exports = {
  statusHandler,
  errorStatusHandler,
  progressStatus,
  completeStatus,
  failStatus,
  findStatus,
  deleteStatus,
  updateStatus
}