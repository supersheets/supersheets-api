const uuidV4 = require('uuid/v4')
const COLLECTION = "status"

async function startStatus(db, metadata, user, options) {
  options = options || { }
  let status = createStatus(metadata, user, options)
  await db.collection(COLLECTION).insertOne(status, { w: 1 })
  return status
}

async function updateStatus(db, metadata, user, sheet, uuid) {
  let query = { uuid }
  let update = createSheetUpdateStatus(metadata, user, sheet)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

async function completeStatus(db, metadata, user, uuid) {
  let query = { uuid }
  let update = createSuccessStatus(metadata, user)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

async function errorStatus(db, metadata, user, uuid, err) {
  let query = { uuid }
  let update = createFailureStatus(metadata, user, err)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

async function getStatus(db, query) {
  return await db.collection(COLLECTION).findOne(query)
}

async function deleteStatus(db, query) {
  return await db.collection(COLLECTION).deleteOne(query)
}

function createStatus(metadata, user, options) {
  options = options || { }
  let d = new Date()
  return {
    uuid: options.uuid || uuidV4(),
    status: "INIT",
    sheet_id: metadata.id,
    sheet_uuid: metadata.uuid,
    sheet_current_datauuid: metadata.datauuid,
    sheet_new_datauuid: options.datauuid,
    num_sheets_loaded: 0,
    num_sheets_total: metadata.sheets.length,
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


function createSheetUpdateStatus(metadata, user, sheet) {
  let d = new Date()
  return {
    "$set": { 
      status: "PROGRESS", 
      updated_at: d, 
      updated_by: user.userid,
      updated_by_email: user.email,
      updated_by_org: user.org
    }, 
    "$inc": {
      num_sheets_loaded: 1
    },
    "$push": {
      sheets_loaded: sheet.title
    }
  }
}

function createSuccessStatus(metadata, user) {
  let d = new Date()
  return {
    "$set": {
      status: "SUCCESS",
      updated_at: d, 
      updated_by: user.userid,
      updated_by_email: user.email,
      updated_by_org: user.org
    }
  }
}

function createFailureStatus(metadata, user, error) {
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
    }
  }
}

module.exports = {
  startStatus,
  updateStatus,
  completeStatus,
  errorStatus,
  getStatus,
  deleteStatus,
  createStatus,
  createSheetUpdateStatus,
  createSuccessStatus,
  createFailureStatus
}