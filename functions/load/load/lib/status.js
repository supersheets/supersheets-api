const uuidV4 = require('uuid/v4')
const COLLECTION = "status"

async function updateStatus(db, status, sheet) {
  let query = { uuid: status.uuid }
  let update = createSheetUpdateStatus(sheet)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

async function completeStatus(db, status) {
  let query = { uuid: status.uuid }
  let update = createSuccessStatus(status)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

async function errorStatus(db, status, err) {
  let query = { uuid: status.uuid }
  let update = createFailureStatus(status, err)
  return await db.collection(COLLECTION).updateOne(query, update, { w: 1 })
}

// Helpers for unit testing
async function getStatus(db, query) {
  return await db.collection(COLLECTION).findOne(query)
}

async function deleteStatus(db, query) {
  return await db.collection(COLLECTION).deleteOne(query)
}

function createSheetUpdateStatus(sheet) {
  let d = new Date()
  return {
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
}

function createSuccessStatus(status) {
  let d = new Date()
  let duration = d.getTime() - status.created_at.getTime()
  return {
    "$set": {
      status: "SUCCESS",
      updated_at: d, 
      completed_at: d,
      duration
    }
  }
}

function createFailureStatus(status, error) {
  let d = new Date()
  let duration = d.getTime() - status.created_at.getTime()
  return {
    "$set": {
      status: "FAILURE",
      error: true,
      errorMessage: error.message,
      updated_at: d, 
      completed_at: d,
      duration
    }
  }
}


// async function startStatus(db, metadata, user, options) {
//   options = options || { }
//   let status = createStatus(metadata, user, options)
//   await db.collection(COLLECTION).insertOne(status, { w: 1 })
//   return status
// }

// function createStatus(metadata, user, options) {
//   options = options || { }
//   let d = new Date()
//   return {
//     uuid: options.uuid || uuidV4(),
//     status: "INIT",
//     sheet_id: metadata.id,
//     sheet_uuid: metadata.uuid,
//     sheet_current_datauuid: metadata.datauuid,
//     sheet_new_datauuid: options.datauuid,
//     num_sheets_loaded: 0,
//     num_sheets_total: metadata.sheets.length,
//     sheets_loaded: [ ],
//     created_at: d,
//     created_by: user.userid,
//     created_by_email: user.email,
//     created_by_org: user.org,
//     updated_at: d,
//     updated_by: user.userid,
//     updated_by_email: user.email,
//     updated_by_org: user.org,
//     error: null
//   }
// }


module.exports = {
  updateStatus,
  completeStatus,
  errorStatus,
  getStatus,
  deleteStatus
}