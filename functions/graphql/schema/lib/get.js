const { generate } = require('./schema')

async function getHandler(ctx) {
  let db = ctx.state.mongodb
  let id = ctx.event.pathParameters.spreadsheetid
  let metadata = null
  try {
    metadata = await getMetadata(db, id)
  } catch (err) {
    ctx.response.httperror(500, `Error looking up metadata for ${id}`, { expose: true })
    return
  } 
  if (!metadata) {
    ctx.response.httperror(404, `Could not find metadata with id ${id}`)
    return
  }
  ctx.response.json({
    metadata,
    schema: generate(metadata)
  })
  return
}

async function getMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}

module.exports = {
  getHandler,
  getMetadata
}