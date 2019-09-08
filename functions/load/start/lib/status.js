const uuidV4 = require('uuid/v4')
const COLLECTION = "status"

async function startStatus(db, metadata, user, options) {
  options = options || { }
  let status = createStatus(metadata, user, options)
  await db.collection(COLLECTION).insertOne(status, { w: 1 })
  return status
}

function createStatus(metadata, user, options) {
  options = options || { }
  let d = new Date()
  return {
    uuid: options.uuid || uuidV4(),
    status: options.dryrun && "DRYRUN" || "INIT",
    sheet_id: metadata.id,
    sheet_uuid: metadata.uuid || null,
    sheet_current_datauuid: metadata.datauuid || metadata.id,
    sheet_new_datauuid: options.datauuid,
    num_sheets_loaded: 0,
    num_sheets_total: metadata.sheets && metadata.sheets.length || -1,
    sheets_loaded: [ ],
    created_at: d,
    created_by: user.userid,
    created_by_email: user.email,
    created_by_org: user.org,
    updated_at: d,
    updated_by: user.userid,
    updated_by_email: user.email,
    updated_by_org: user.org,
    error: null
  }
}

async function errorStatus(db, metadata, user, uuid, err, duration) {
  let query = { uuid }
  let update = createFailureStatus(metadata, user, err, duration)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

function createFailureStatus(metadata, user, error, duration) {
  let d = new Date()
  return {
    "$set": {
      status: "FAILURE",
      error: {
        errorMessage: error.message
      },
      updated_at: d, 
      updated_by: user.userid,
      updated_by_email: user.email,
      updated_by_org: user.org,
      completed_at: d,
      duration
    }
  }
}


// Only needed for testing purposes 

async function getStatus(db, query) {
  return await db.collection(COLLECTION).findOne(query)
}

async function deleteStatus(db, query) {
  return await db.collection(COLLECTION).deleteOne(query)
}

module.exports = {
  startStatus,
  errorStatus,
  createStatus,
  createFailureStatus,
  getStatus,
  deleteStatus
}