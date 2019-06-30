async function getHandler(ctx) {
  ctx.response.json(await getMetadata(ctx.state.mongodb, ctx.event.pathParameters.spreadsheetid))
  return
}

async function getMetadata(db, id) {
  return await db.collection('spreadsheets').findOne({ id })
}

module.exports = {
  getHandler,
  getMetadata
}