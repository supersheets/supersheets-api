const { JSONPath } = require('jsonpath-plus')
const docidRegex = new RegExp("/document/d/([a-zA-Z0-9-_]+)")
const GRAPHQL_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/
const KEY_PREFIX = "$"
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
  // this is where we us docmatter and format new data
  // {
  //   ...data
  //   _content: <compressed doc>
  //   _text: <uncompressed text>
  // }
  // actually should put the logic above in extractData
  // because it needs to filter for names etc.
  let data = extractData(doc)
  return Object.assign(reserved, data) // ensures that reserved keys sorted first
}

function extractData(doc) {
  let tables = extractTables(doc)
  let values = tables.map(cells => matchKeysAndValues(cells))
  let data = Object.assign({}, ...values)
  data["_doc"] = doc
  return data
}

function extractTables(doc) {
  let path = "$..table"
  let tables = JSONPath(path, doc)
  return tables.filter(table => table.columns == 2).map(table => extractCells(table))
}

function extractCells(table) {
  let path = "$..tableCells[*][content]"
  let cells = JSONPath(path, table)
  return cells.map(cell => extractParagraphs(cell))
}

function extractParagraphs(cell) {
  if (isFieldName(cell)) {
    return extractFieldName(cell)
  } 
  return cell
  // return { 
  //   text: extractTextContent(cell),
  //   content: cell
  // } 
}

function isFieldName(cell) {
  let path = "$..elements..textRun..content"
  let paragraphs = JSONPath(path, cell)
  let name = paragraphs[0].trim()
  return isFieldNameValid(name) 
}

function isFieldNameValid(name) {
  if (!name || !name.startsWith(KEY_PREFIX)) return false
  let field = name.substring(KEY_PREFIX.length)
  return field && !field.startsWith(IGNORE_PREFIX) && name.substring(KEY_PREFIX.length).match(GRAPHQL_NAME_REGEX) || false
}

function extractFieldName(cell) {
  let path = "$..elements..textRun..content"
  let paragraphs = JSONPath(path, cell)
  return paragraphs[0].trim()
}

function matchKeysAndValues(cells) {
  let values = { }
  let key = null
  for (let cell of cells) {
    if (typeof cell === "string" && cell.startsWith("$")) {
      key = cell
      continue
    }
    if (key) {
      //values[key.substring(1)] = cell.text
      values[key.substring(1)] = cell
      key = null
    }
  }
  return values
}


module.exports = {
  isGoogleDoc,
  extractData,
  fetchDocsData,
  fetchDocsForColumns,
  fetchDoc,
  isFieldName,
  isFieldNameValid
}