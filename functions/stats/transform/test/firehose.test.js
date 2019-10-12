require('dotenv').config()

const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk')

// https://github.com/awslabs/serverless-application-model/blob/master/examples/apps/kinesis-firehose-cloudwatch-logs-processor/testEvent.json
const EVENT_PROCESSED_ENCODED = 'event.processed.encoded.json'

const { 
  getPutRecordBatch, 
  processForReingestion, 
  createReingestionRecord, 
  reingestRecords,
  batchReingestionRecords } = require('../lib/firehose')

describe('getPutRecordBatch', () => {
  let putRecordBatch = null
  let streamName = null
  beforeAll(async () => {
    putRecordBatch = getPutRecordBatch(new AWS.Firehose())
    streamName = process.env.FIREHOSE_STREAM_NAME
  })
  it ('should successfully write to firehose stream (reingestion)', async () => {
    let data = getTestEvent('event.processed.encoded.json')
    let records = [ createReingestionRecord(data.find(r => r.data)) ]
    await putRecordBatch({
      DeliveryStreamName: streamName,
      Records: records
    })
  })
})

describe('Reingestion', () => {
  let records = [ ]
  beforeEach(async () => {
    records = getTestEvent(EVENT_PROCESSED_ENCODED)
  })
  it ('should create a reingestion record', async () => {
    let reingest = createReingestionRecord(records.find(r => r.data))
    expect(reingest).toEqual({
      Data: expect.anything()
    })
  })
  it ('should calculate reingestion given a size limit', async () => {
    let res = processForReingestion(records, { limit: 500 })
    expect(res.records).toEqual([
      {
        "recordId": "49578734086442259037497492980620233840400173390482112514000000",
        "result": "Dropped"
      },
      {
        "recordId": "49578734086442259037497492980621442766219788363254202370000000",
        "result": "Ok",
        "data": "ODQ5OTg0NmEtODhjMS00ZmIzLWJmY2EtMTE3ZWMwMjNjNWMzCjU2MTUxNTJmLWFlM2UtNDE2My1iYmQwLWMyNmEyNDFlNGNhMQpiZmFjYmVlYi1lNWFiLTRiZGQtYjZmYy00ZjBiZWJkNGZhMDkK"
      },
      {
        "recordId": "49578734086442259037497492980622651692039402992428908546000000",
        "result": "Dropped"
      },
      {
        "recordId": "49578734086442259037497492980623860617859017621603614722000000",
        "result": "Dropped"
      }
    ])
    expect(res).toMatchObject({
      "process_n": 1,
      "process_size": 396,
      "reingest_n": 2,
      "reingest_size": 296
    })
    expect(res.reingest.length).toBe(2)
    expect(res.reingest[0]).toEqual({
      Data: expect.anything()
    })
  })
})

describe('reingestRecords', () => {
  let putRecordBatch = null
  let streamName = null
  let records = [ ]
  beforeAll(async () => {
    putRecordBatch = getPutRecordBatch(new AWS.Firehose())
    streamName = process.env.FIREHOSE_STREAM_NAME
  })
  beforeEach(async () => {
    records = getTestEvent(EVENT_PROCESSED_ENCODED)
      .filter(r => r.data)
      .map(r => createReingestionRecord(r))
  })
  it ('should throw if there are errors', async () => {
    let failures = getFailureRequestResponses()
    let mock = putRecordBatchMock(failures)
    let error = null 
    try {
      await reingestRecords(mock, streamName, records, { })
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(`putRecordsBatch succeeded but ${failures.length} of ${records.length } failed reingestion`)
  })
  it ('should successfully reingest records', async () => {
    let res = await reingestRecords(putRecordBatch, streamName, records, { })
    expect(res).toEqual({ n: 3 })
  })
})

describe('batchReingestionRecords', () => {
  it ('should batch by number of messages', async () => {
    let records = [
      { Data: "A123456789" },
      { Data: "B123456789" },
      { Data: "C123456789" }
    ]
    let batches = batchReingestionRecords(records, { limit_n: 2 })
    expect(batches.length).toBe(2)
    expect(batches[0]).toEqual([ records[0], records[1] ])
    expect(batches[1]).toEqual([ records[2] ])
  })
  it ('should batch by total size', async () => {
    let records = [
      { Data: "A123456789" },
      { Data: "B123456789" },
      { Data: "C123456789" }
    ]
    let batches = batchReingestionRecords(records, { limit_size: 20 })
    expect(batches.length).toBe(2)
    expect(batches[0]).toEqual([ records[0], records[1] ])
    expect(batches[1]).toEqual([ records[2] ])
  })
})

function getTestEvent(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'events', name)).toString('utf8'))
}


function putRecordBatchMock(RequestResponses) {
  return async () => {
    return {
      RequestResponses
    }
  }
}

// An unsuccessfully processed record includes ErrorCode and ErrorMessage values. 
// ErrorCode reflects the type of error, and is one of the following values: ServiceUnavailableException or InternalFailure. 
// ErrorMessage provides more detailed information about the error.
function getFailureRequestResponses() {
  return [ 
    {
      ErrorCode: "ServiceUnavailableException",
      ErrorMessage: "Some ServiceUnavailableException Message"
    },
    {
      ErrorCode: "InternalFailure",
      ErrorMessage: "Some InternalFailure Message"
    }
  ]
}