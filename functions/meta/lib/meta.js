
const uuidV4 = require('uuid/v4')

async function metaHandler(ctx) {
  let metadata = await fetchMetadata(ctx.state.axios, ctx.event.pathParameters.spreadsheetid, ctx.env) 
  ctx.response.json(await updateMetadata(ctx.state.mongodb, metadata))
  return
}

async function fetchMetadata(axios, id, options) {
  let url = `${options.GOOGLESHEETS_BASE_URL}/${id}?key=${options.GOOGLESHEETS_API_KEY}`
  let spreadsheet = (await axios.get(url)).data
  return createMetadataFromGoogleSpreadsheet(spreadsheet)
}

async function updateMetadata(db, metadata) {
  let id = metadata.id
  await db.collection('spreadsheets').updateOne({ id }, { "$set": metadata }, { upsert: true })
  return await db.collection('spreadsheets').findOne({ id })
}

function createMetadataFromGoogleSpreadsheet(doc) {
  var metadataDoc = {
    uuid: uuidV4(),
    id: doc.spreadsheetId,
    url: doc.spreadsheetUrl,
    title: doc.properties.title,
    tz: doc.properties.timeZone,
    local: doc.properties.locale,
    updated_at: new Date()
  }
  
  var sheets = [ ];
  
  for (var i=0; i<doc.sheets.length; i++) {
    var sheetDoc = doc.sheets[i].properties; 
    sheets.push({
      id: sheetDoc.sheetId,
      title: sheetDoc.title,
      index: sheetDoc.index,
      sheetType: sheetDoc.sheetType
    })
  }
  metadataDoc.sheets = sheets;
  return metadataDoc;
}


module.exports = {
  metaHandler,
  fetchMetadata,
  updateMetadata,
  createMetadataFromGoogleSpreadsheet
}