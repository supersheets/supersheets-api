function transform(logEvent) {
  let parts = logEvent.message.split('\t')
  let data = null
  try {
    data = JSON.parse(parts[3])
  } catch (err) {
    console.error(`Could not parse JSON from message ${logEvent.id}: ${parts[3]}`)
    console.error(err)
  }
  if (!data || data.msg != "STAT") return null
  let metadata = {
    "x-correlation-id": data["x-correlation-id"],
    awsRequestId: data.awsRequestId,
    time: data.time,
    utc: new Date(data.time).toISOString(),
    functionName: data.functionName,
    functionVersion: data.functionVersion,
    invokedQualifier: data.invokedQualifier,
  }
  return JSON.stringify(Object.assign(metadata, data.cache))
}

module.exports = {
  transform
}