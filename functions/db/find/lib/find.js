async function findHandler(ctx) {
  let id = ctx.event.pathParameters['spreadsheetid']
  let body = ctx.event.body
  let db = ctx.state.mongodb
  let metadata = await findMetadata(db, id)
  let { one, query, options } = prepareMongoFindQuery(body)
  ctx.logger.debug(`find id=${id} datauuid=${metadata.datauuid} ${JSON.stringify({ one, query, options }, null, 2)}`)
  let result = await findMongo(db, (metadata.datauuid || id), one, query, options)
  ctx.response.json(result) 
  return
}

async function findMongo(db, id, one, query, options) {
  let count = -1
  if (one) {
    result = await db.collection(id).findOne(query, options)
    count = result && 1 || 0
  } else {
    result = await db.collection(id).find(query, options).toArray()
    count = result.length
  }
  return { query, one, result, count }
}

function prepareMongoFindQuery(body) {
  let one = (body.one == true) || false
  let query = body.query || { } // we get all docs if no query sent
  let projection = body.projection || null;
  let limit = parseInt(body.limit) || 1000;
  let skip = parseInt(body.skip) || 0;
  let sort = body.sort || [ [ "_sheet", 'ascending' ], [ "_row", 'ascending' ] ];   
  let options = {
    limit: limit,
    skip: skip,
    sort: sort,
  }
  if (projection) {
    options.projection = projection
  }
  return { one, query, options }
}

async function findMetadata(db, id) {
  let options = {
    projection: { id: 1, uuid: 1, datauuid: 1 }
  }
  return await db.collection('spreadsheets').findOne({ id }, options)
}

module.exports = {
  findHandler,
  prepareMongoFindQuery,
  findMongo
}
