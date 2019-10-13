const { promisify } = require('util')
const MAX_RESULTS = 1000

async function executeQuery(athena, dbname, query, options) {
  options = options || { }
  let startQueryExecution = promisify(athena.startQueryExecution).bind(athena)
  let getQueryExecution = promisify(athena.getQueryExecution).bind(athena)
  let getQueryResults = promisify(athena.getQueryResults).bind(athena)
  
  let { QueryExecutionId } = await startQueryExecution({
    QueryString: query,
    QueryExecutionContext: { Database: dbname },
    WorkGroup: 'primary'
  })
  console.log(`Started query ${QueryExecutionId}`)
  // "QUEUED"
  // "RUNNING"
  // "SUCCEEDED"
  // "FAILED"
  // "CANCELLED"

  let state = 'UNKNOWN'
  while (![ "SUCCEEDED", "FAILED", "CANCELLED" ].includes(state)) {
    await wait(10 * 1000)
    let { QueryExecution } = await getQueryExecution({ QueryExecutionId })
    state = QueryExecution.Status.State
    console.log(`state=${state}`)
    if (state == "FAILED") {
      console.error(`Query ${QueryExecutionId} failed: ${QueryExecution.Status.StateChangeReason}`)
    }
  }
  
  if (state != "SUCCEEDED") return null

  let { ResultSet } = await getQueryResults({
    QueryExecutionId,
    MaxResults: options.MaxResults || MAX_RESULTS,
    NextToken: null
  })
  return ResultSet
} 

async function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(ms), ms)
  }) 
}
module.exports = {
  executeQuery
}