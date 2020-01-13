const zlib = require('zlib')

function process(event, options) {
  options = options || { }
  let records = decompressRecords(event)
  let processed = processRecords(records, options)
  return encodeData(processed)
}

function decompressRecords(event) {
  return event.records.map(record => {
    const buffer = Buffer.from(record.data, 'base64')
    record.data = JSON.parse(zlib.gunzipSync(buffer))
    return record
  })
}

function processRecords(records, options) {
  return records.map(r => processRecord(r, options))
}

function processRecord(record, options) {
  options = options || { }
  let transform = options.transform || defaultTransform
  switch(record.data.messageType) {
    case "CONTROL_MESSAGE":
      return {
        recordId: record.recordId,
        result: 'Dropped'
      }
    case "DATA_MESSAGE":
      return {
        recordId: record.recordId,
        result: 'Ok',
        data: record.data.logEvents.map(transform).filter(r => r).join('\n').concat('\n')
      }
    default:
      return {
        recordId: record.recordId,
        result: 'ProcessingFailed'
      }
  }
}

function encodeData(records) {
  for (let record of records) {
    if (record.result == "Ok" && record.data !== undefined) {
      record.data = Buffer.from(record.data).toString('base64')
    }
  }
  return records
}

/**
 * logEvent has this format:
 *
 * {
 *   "id": "01234567890123456789012345678901234567890123456789012345",
 *   "timestamp": 1510109208016,
 *   "message": "log message 1"
 * }
 *
 * The default implementation below just extracts the message and appends a newline to it.
 *
 * The result must be returned in a Promise.
 */
function defaultTransform(logEvent) {
  return logEvent.message
}

module.exports = {
  process,
  decompressRecords,
  processRecords,
  processRecord,
  defaultTransform,
  encodeData
}
