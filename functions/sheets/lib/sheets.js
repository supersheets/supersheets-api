async function sheetsHandler(ctx) {
  ctx.response.json(await getSheetsForOrg(ctx.state.mongodb))
  return
}

// Hack: For now we just return all sheets in the db! Meta doesn't store
// any info about the org or the creater/updater of the sheet.
async function getSheetsForOrg(db, id) {
  let query = { }
  let options = {
    sort: [ [ 'title', 1 ] ],
    projection: { id: 1, title: 1, updated_at: 1, uuid: 1, nrows: 1 }
  }
  return await db.collection('spreadsheets').find(query, options).toArray()
}

module.exports = {
  sheetsHandler,
  getSheetsForOrg
}