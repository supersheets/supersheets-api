const { promisify } = require('util')

const MAX_LAMBDA_SIZE = 6000000
const MAX_FIREHOSE_SIZE = 4000000
const MAX_FIREHOSE_RECORDS = 500

function getPutRecordBatch(firehose) {
  return promisify(firehose.putRecordBatch).bind(firehose)
}

// The Lambda synchronous invocation mode has a payload size limit of 6 MB for both the request and the response. Make sure that your buffering size for sending the request to the function is less than or equal to 6 MB. Also ensure that the response that your function returns doesn't exceed 6 MB.
function processForReingestion(records, { limit }) {
  limit = limit || MAX_LAMBDA_SIZE
  let process_n = 0
  // We have to send all the recordIds back
  let process_size = records.reduce((a, v) => a + v.recordId.length, 0)
  let reingest = [ ]
  let reingest_n = 0
  let reingest_size = 0
  for (let r of records) {
    if (r.result != 'Ok') continue
    if ((process_size + r.data.length) >= limit) {
      reingest.push(createReingestionRecord(r))
      reingest_n += 1
      reingest_size += r.data.length
      r.result = 'Dropped'
      delete r.data
    } else {
      process_n += 1
      process_size += r.data.length
    }
  }
  return {
    records,
    process_n, process_size,
    reingest, reingest_n, reingest_size
  }
}

// The PutRecordBatch operation can take up to 500 records per call or 4 MiB per call, whichever is smaller. This limit cannot be changed.


// A successfully processed record includes a RecordId value, 
// which is unique for the record. 
async function reingestRecords(putRecordsBatch, streamName, records, { attemptsMade, maxAttempts }) {
  let data = [ ]
  let failures = [ ]
  try {
    data = await putRecordsBatch({
      DeliveryStreamName: streamName,
      Records: records
    })
    failures = data.RequestResponses.filter(r => r.ErrorCode)
  } catch (err) {
    console.error(`Error calling putRecordsBatch: ${err.message}`)
    throw err
    // failures = records // only when we want to attempt retries
  }
  // Don't do retries for now. 
  // Instead throw exception and note number of failures
  if (failures.length > 0) {
    console.error(`putRecordsBatch succeeded but ${failures.length} of ${records.length } failed reingestion`)
    console.error(JSON.stringify(failures))
    throw new Error(`putRecordsBatch succeeded but ${failures.length} of ${records.length } failed reingestion`)
  } else {
    console.log(`putRecordsBatch succeeded ${records.length} records reingested`)
    return {
      n: records.length
    }
  }
  // if (failures.length > 0) {
  //   if ((attemptsMade + 1) < maxAttempts) {
  //     return await reingestRecords(firehose, streamName, failures, { 
  //       attemptsMade: attemptsMade + 1,
  //       maxAttempts,
  //       limit_n, 
  //       limit_size
  //     })
  //   } else {
  //     throw new Error(`Could not put records after ${maxAttempts}.`)
  //   }
  // } else {
  //   return true
  // }
}

// TODO: probably should check this here and throw if exceeds size
// The maximum size of a record sent to Kinesis Data Firehose, before base64-encoding, is 1,000 KiB.
function createReingestionRecord(originalRecord) {
  if (originalRecord.result != 'Ok' || !originalRecord.data) {
    throw new Error(`Invalid reingestion record: ${JSON.stringify(originalRecord)}`)
  }
  return {
      Data: Buffer.from(originalRecord.data, 'base64'),
  }
}

// The PutRecordBatch operation can take up to 500 records per call or 4 MiB per call, whichever is smaller. This limit cannot be changed.
function batchReingestionRecords(records, options) {
  options = options || { }
  let limit_n = options.limit_n || MAX_FIREHOSE_RECORDS
  let limit_size = options.limit_size || MAX_FIREHOSE_SIZE
  let batches = [ ]
  let batch = [ ]
  let batch_n = 0
  let batch_size = 0
  for (let record of records) {
    if ((batch_n + 1) <= limit_n 
      && (batch_size + record.Data.length) <= limit_size) {
      // add to current batch
      batch.push(record)
      batch_n += 1
      batch_size += record.Data.length
    } else {
      // batch is full, start a new batch
      batches.push(batch)
      batch = [ record ]
      batch_n = 0
      batch_size = 0
    }
  }
  if (batch.length > 0) {
    batches.push(batch)
  }
  return batches
}

module.exports = {
  getPutRecordBatch,
  processForReingestion,
  createReingestionRecord,
  reingestRecords,
  batchReingestionRecords
}





// function putRecordsToFirehoseStream(streamName, records, client, resolve, reject, attemptsMade, maxAttempts) {
//   client.putRecordBatch({
//       DeliveryStreamName: streamName,
//       Records: records,
//   }, (err, data) => {
//       const codes = [];
//       let failed = [];
//       let errMsg = err;

//       if (err) {
//           failed = records;
//       } else {
//           for (let i = 0; i < data.RequestResponses.length; i++) {
//               const code = data.RequestResponses[i].ErrorCode;
//               if (code) {
//                   codes.push(code);
//                   failed.push(records[i]);
//               }
//           }
//           errMsg = `Individual error codes: ${codes}`;
//       }

//       if (failed.length > 0) {
//           if (attemptsMade + 1 < maxAttempts) {
//               console.log('Some records failed while calling PutRecordBatch, retrying. %s', errMsg);
//               putRecordsToFirehoseStream(streamName, failed, client, resolve, reject, attemptsMade + 1, maxAttempts);
//           } else {
//               reject(`Could not put records after ${maxAttempts} attempts. ${errMsg}`);
//           }
//       } else {
//           resolve('');
//       }
//   });
// }


// for (let idx = 0; idx < event.records.length && projectedSize > 6000000; idx++) {
//   const rec = result.records[idx];
//   if (rec.result === 'Ok') {
//       totalRecordsToBeReingested++;
//       recordsToReingest.push(getReingestionRecord(isSas, inputDataByRecId[rec.recordId]));
//       projectedSize -= rec.data.length;
//       delete rec.data;
//       result.records[idx].result = 'Dropped';

//       // split out the record batches into multiple groups, 500 records at max per group
//       if (recordsToReingest.length === 500) {
//           putRecordBatches.push(recordsToReingest);
//           recordsToReingest = [];
//       }
//   }
// }

// if (recordsToReingest.length > 0) {
//   // add the last batch
//   putRecordBatches.push(recordsToReingest);
// }

// if (putRecordBatches.length > 0) {
//   new Promise((resolve, reject) => {
//       let recordsReingestedSoFar = 0;
//       for (let idx = 0; idx < putRecordBatches.length; idx++) {
//           const recordBatch = putRecordBatches[idx];
//           if (isSas) {
//               const client = new AWS.Kinesis({ region: region });
//               putRecordsToKinesisStream(streamName, recordBatch, client, resolve, reject, 0, 20);
//           } else {
//               const client = new AWS.Firehose({ region: region });
//               putRecordsToFirehoseStream(streamName, recordBatch, client, resolve, reject, 0, 20);
//           }
//           recordsReingestedSoFar += recordBatch.length;
//           console.log('Reingested %s/%s records out of %s in to %s stream', recordsReingestedSoFar, totalRecordsToBeReingested, event.records.length, streamName);
//       }
//   }).then(
//       () => {
//           console.log('Reingested all %s records out of %s in to %s stream', totalRecordsToBeReingested, event.records.length, streamName);
//           callback(null, result);
//       },
//       failed => {
//           console.log('Failed to reingest records. %s', failed);
//           callback(failed, null);
//       });
// } else {
//   console.log('No records needed to be reingested.');
//   callback(null, result);
// }
// }).catch(ex => {
//   console.log('Error: ', ex);
//   callback(ex, null);
// });
// };
