const { JSONPath } = require('jsonpath-plus')
const docidRegex = new RegExp("/document/d/([a-zA-Z0-9-_]+)")
const GRAPHQL_NAME_REGEX = /^[_A-Za-z][_0-9A-Za-z]*$/
const KEY_PREFIX = "$"

function isGoogleDoc(url) {
  let match = docidRegex.exec(url)
  return match && match[1] || false
}

// Basically how this works
// 1) Find all the 2 column tables in the doc (extractTables)
// - 2 column format could be relaxed. we just need cell order to be key,val,key,val
// 2) We get a list of all cells in the table
// - if the first line in the cell starts with '$' is a key
// - otherwise it is a value { text: , content: }
// 3) We match key and value based on cell order
// 4) We mash all tables key-values together and return

//let path = "$..table[?(@.columns === 2)]"
// I think the above doesn't work as advertized because table
// isn't in an array like the "books" example in the doc

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
  return name && name.startsWith(KEY_PREFIX) && name.substring(KEY_PREFIX.length).match(GRAPHQL_NAME_REGEX) 
}

function extractFieldName(cell) {
  let path = "$..elements..textRun..content"
  let paragraphs = JSONPath(path, cell)
  return paragraphs[0].trim()
}

function extractTextContent(cell) {
  let path = "$..elements..textRun..content"
  let lines = JSONPath(path, cell)
  return lines.join('').trim()
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
  extractData
}