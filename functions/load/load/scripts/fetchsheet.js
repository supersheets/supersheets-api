require('dotenv').config()
const axios = require('axios')
const awsParamStore = require('aws-param-store')
const { fetchSheetData } = require('../lib/sheet')

let id = process.argv[2]
let title = process.argv[3]
let mode = process.argv[4] || "UNFORMATTED"

configure()
.then(({ sheetsapi }) => {
  return fetch({ axios: sheetsapi, id, title })
})
.then((data) => {
  console.log(JSON.stringify(data, null, 2))
})
.catch((err) => {
  console.error(err)
})
.finally(() => {
  console.log("END")
})

async function configure() {
  let token = (await awsParamStore.getParameter(process.env.FUNC_GOOGLE_SERVICE_ACCOUNT_TOKEN_PATH)).Value
  const sheetsapi = axios.create({
    baseURL: process.env.GOOGLESHEETS_BASE_URL
  })
  sheetsapi.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return { sheetsapi }
}
async function fetch({ axios, id, title }) {
  console.log(`Fetching Google Spreadsheet id=${id} title=${title}`)
  return await fetchSheetData(axios, id, { title }, { mode })
}


