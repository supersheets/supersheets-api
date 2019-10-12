const AWS = require('aws-sdk')
const eventlib = require('./lib/event')
const { 
  getPutRecordBatch, 
  processForReingestion, 
  batchReingestionRecords, 
  reingestRecords } = require('./lib/firehose')

const MAX_LAMBDA_SIZE = 6000000    // ~6MB
const MAX_FIREHOSE_SIZE = 4000000  // ~4MB
const MAX_FIREHOSE_RECORDS = 500   

async function handler(event, context) {
  const streamARN = event.deliveryStreamArn
  const region = streamARN.split(':')[3]
  const streamName = streamARN.split('/')[1]

  const firehose = new AWS.Firehose({ region })
  const putRecordBatch = getPutRecordBatch(firehose)

  // Service limits
  // We let these be specified in env variables for testing
  const limit_lambda_size = process.env.MAX_LAMBDA_SIZE && parseInt(process.env.MAX_LAMBDA_SIZE) || MAX_LAMBDA_SIZE
  const limit_firehose_n = process.env.MAX_LAMBDA_SIZE && parseInt(process.env.MAX_FIREHOSE_RECORDS) || MAX_FIREHOSE_RECORDS
  const limit_firehose_size = process.env.MAX_LAMBDA_SIZE && parseInt(process.env.MAX_FIREHOSE_SIZE) || MAX_FIREHOSE_SIZE
  console.debug(`limit_lambda_size=${limit_lambda_size},limit_firehose_n=${limit_firehose_n}`,`limit_firehose_size=${limit_firehose_size}`)

  let processed = eventlib.process(event)
  let { records, reingest } = processForReingestion(processed, { limit: limit_lambda_size })
  if (reingest.length > 0) {
    console.warn(`Need to reingest ${reingest.length} records`)
    let batches = batchReingestionRecords(reingest, { 
      limit_n: limit_firehose_n, 
      limit_size: limit_firehose_size 
    })
    console.log(`Reingesting ${batches.length} batches`)
    let nbatch = 1
    for (let batch of batches) {
      console.log(`Reingesting batch ${nbatch} (${batch.length} records)`)
      await reingestRecords(putRecordBatch, streamName, batch, { })
      nbatch += 1
    }
  }
  return { records } 
}

module.exports = {
  handler
}

/*
For processing data sent to Firehose by Cloudwatch Logs subscription filters.

Cloudwatch Logs sends to Firehose records that look like this:

{
  "messageType": "DATA_MESSAGE",
  "owner": "123456789012",
  "logGroup": "log_group_name",
  "logStream": "log_stream_name",
  "subscriptionFilters": [
    "subscription_filter_name"
  ],
  "logEvents": [
    {
      "id": "01234567890123456789012345678901234567890123456789012345",
      "timestamp": 1510109208016,
      "message": "log message 1"
    },
    {
      "id": "01234567890123456789012345678901234567890123456789012345",
      "timestamp": 1510109208017,
      "message": "log message 2"
    }
    ...
  ]
}

The data is additionally compressed with GZIP.

The code below will:

1) Gunzip the data
2) Parse the json
3) Set the result to ProcessingFailed for any record whose messageType is not DATA_MESSAGE, thus redirecting them to the
   processing error output. Such records do not contain any log events. You can modify the code to set the result to
   Dropped instead to get rid of these records completely.
4) For records whose messageType is DATA_MESSAGE, extract the individual log events from the logEvents field, and pass
   each one to the transformLogEvent method. You can modify the transformLogEvent method to perform custom
   transformations on the log events.
5) Concatenate the result from (4) together and set the result as the data of the record returned to Firehose. Note that
   this step will not add any delimiters. Delimiters should be appended by the logic within the transformLogEvent
   method.
6) Any additional records which exceed 6MB will be re-ingested back into Firehose.
*/