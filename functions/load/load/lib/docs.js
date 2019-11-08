const { JSONPath } = require('jsonpath-plus')
const docidRegex = new RegExp("/document/d/([a-zA-Z0-9-_]+)")
const GRAPHQL_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/
//const KEY_PREFIX = "$"
const KEY_PREFIX = ''
const IGNORE_PREFIX = "_"
const docmatter = require('@supersheets/docmatter')

async function fetchDocsData(axios, metadata, cols, docs) {
  if (!hasGoogleDocDataTypes(metadata)) return
  let doccols = filterGoogleDocColumns(metadata, cols)
  await fetchDocsForColumns(axios, doccols, docs)
}

async function fetchDocsForColumns(axios, cols, docs) {
  for (let doc of docs) {
    for (let col of cols) {
      if (doc[col] && isGoogleDoc(doc[col])) {
        doc[col] = await fetchDoc(axios, doc[col])
      }
    }
  }
}

function hasGoogleDocDataTypes(metadata) {
  if (!hasDataTypes(metadata)) return false
  let datatypes = metadata.config.datatypes
  for (let col in datatypes) {
    if (datatypes[col] == "GoogleDoc") return true
  }
  return false
}

function hasDataTypes(metadata) {
  return metadata && metadata.config && metadata.config.datatypes || null
}

function filterGoogleDocColumns(metadata, cols) {
  let datatypes = metadata.config && metadata.config.datatypes || { }
  return cols.filter(col => datatypes[col] == "GoogleDoc")
}

function isGoogleDoc(url) {
  let match = docidRegex.exec(url)
  return match && match[1] || false
}

async function fetchDoc(axios, url) {
  let docid = isGoogleDoc(url)
  if (!docid) {
    throw new Error(`Invalid Google Doc URL: ${url}`)
  }
  let doc = (await axios.get(`${docid}`)).data
  let reserved = { '_docid': docid, '_url': url }
  let data = extractData(doc)
  return Object.assign(reserved, data) // ensures that reserved keys sorted first
}

function extractData(doc) {
  let { title, data, content, text } = docmatter(doc, { text: true })
  data = filterValidFields(data)
  //data["_doc"] = doc // leave this in for backward compatibility (for now)
  data["_content"] = content
  data["_text"] = text
  data["_title"] = title
  return data
}

function filterValidFields(data) {
  let filtered = { }
  for (let field in data) {
    if (isFieldNameValid(field)) {
      filtered[field] = data[field]
    }
  }
  return filtered
}

function isFieldNameValid(name) {
  if (!name || !name.startsWith(KEY_PREFIX)) return false
  let field = name.substring(KEY_PREFIX.length)
  return field && !field.startsWith(IGNORE_PREFIX) && name.substring(KEY_PREFIX.length).match(GRAPHQL_NAME_REGEX) || false
}

async function compressGoogleDocContent(metadata, docs) {
  return
}

module.exports = {
  isGoogleDoc,
  extractData,
  fetchDocsData,
  fetchDocsForColumns,
  fetchDoc,
  isFieldNameValid
}