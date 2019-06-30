async function deleteHandler(ctx) {
  let id = ctx.event.pathParameters.spreadsheetid
  let db = ctx.state.mongodb
  await deleteData(db, id)
  let res = await deleteMetadata(db, id)
  ctx.response.json(res.result)
  return
}

async function deleteMetadata(db, id) {
  return await db.collection('spreadsheets').deleteOne({ id })
}

async function deleteData(db, id) {
  return await db.collection(id).drop()
}

module.exports = {
  deleteHandler,
  deleteMetadata,
  deleteData
}