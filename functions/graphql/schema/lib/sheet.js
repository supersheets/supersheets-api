const pluralize = require('pluralize')

const SEP = "___"
const SPACES = "    "

const indent = (n) => {
  return SPACES.repeat(n)
}

const capitalize = (s) => {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const uncapitalize = (s) => {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function generateGraphQLNames(sheet, options) {
  options = options || { }
  let name = sheet.title
  let typeSingular = capitalize(pluralize.singular(name))
  let typePlural = capitalize(pluralize.plural(name))
  
  let type = typeSingular
  let input = `${typeSingular}FilterInput`
  let sort = `${typeSingular}SortInput`
  let enumfields = `${typeSingular}FieldsEnum`
  let connection = `${typeSingular}Connection`
  let edge = `${typeSingular}Edge`
  let find = `find${typePlural}`
  let findOne = `findOne${typeSingular}`

  let docs = { }
  for (let name in sheet.schema.docs) {
    let type = `${typeSingular}${capitalize(pluralize.singular(name))}Doc`
    let input = `${type}FilterInput`
    let sort = `${type}SortInput`
    docs[name] = { name, type, input, sort }
  }
  return {
    name,
    type,
    connection,
    enumfields,
    edge,
    input,
    sort,
    find,
    findOne,
    docs
  }
}

function generateFindQuery(sheet, { level, names }) {
  names = Object.assign(generateGraphQLNames(sheet), names || { })
  let s = `${indent(level)}${names['find']}(\n`
  s += `${indent(level+1)}filter: ${names['input']}\n`
  s += `${indent(level+1)}limit: Int\n`
  s += `${indent(level+1)}skip: Int\n`
  s += `${indent(level+1)}sort: ${names['sort']}\n`
  s += `${indent(level)}): ${names['connection']}`
  return s
}
  // s += `  findOne(filter: ${name}FilterInput, limit: Int, skip: Int, sort: SortInput): ${name}\n`

function generateFindOneQuery(sheet, { level, names }) {
  names = Object.assign(generateGraphQLNames(sheet), names || { })
  let s = `${indent(level)}${names['findOne']}(\n`
  s += `${indent(level+1)}filter: ${names['input']}\n`
  s += `${indent(level+1)}limit: Int\n`
  s += `${indent(level+1)}skip: Int\n`
  s += `${indent(level+1)}sort: ${names['sort']}\n`
  s += `${indent(level)}): ${names['type']}`
  return s
}

function generate(sheet, options) {
  options = options || { }
  options.names = Object.assign(generateGraphQLNames(sheet), options.names || { })
  options.level = options.level || 0
  let names = options.names 
  let s = generateTypeFromSchema(names['type'], sheet.schema, options)
  s += '\n\n'
  s += generateConnectionType(names['connection'], options)
  s += '\n\n'
  s += generateEdgeType(names['edge'], options)
  s += '\n\n'
  s += generateEnumFromSchema(names['enumfields'], sheet.schema, options)
  s += '\n\n'
  s += generateInputFromSchema(names['input'], sheet.schema, options)
  s += '\n\n'
  s += generateSortInput(names['sort'], options)
  s += '\n\n'
  s += generateGoogleDocTypes(sheet.schema.docs, options)
  s += '\n\n'
  s += generateGoogleDocFilterInputs(sheet.schema.docs, options)
  s += '\n\n'
  s += generateGoogleDocSortInputs(sheet.schema.docs, options)
  s += '\n'
  return s
} 

function generateTypeFromSchema(name, schema, { level, names }) {
  level = level || 0
  let s = `type ${name} {\n`
  for (let col of schema.columns) {
    s += `${generateTypeField(col, { level: level+1, names })}\n`
  }
  s += `}`
  return s
}

function generateEnumFromSchema(name, schema, { level }) {
  let s = `enum ${name} {\n`
  for (let col of schema.columns) {
    s += `${indent(level+1)}${col.name}\n`
  }
  s += `}`
  return s
}

function generateInputFromSchema(name, schema, { level, names }) {
  let s = `${indent(level)}input ${name} {\n`
  for (let col of schema.columns) {
    s += `${generateInputField(col, { level: level+1, names })}\n`
  }
  for (let col in schema.docs) {
    let docschema = schema.docs[col]
    for (let field of docschema.fields) {
      s += `${generateInputField({ name: `${col}${SEP}${field.name}`, datatype: field.datatype }, { level: level+1, names })}\n`
    }
  }
  s += `${indent(level)}}`
  return s
}

function generateGoogleDocTypes(docs, { level, names }) {
  let s = ''
  for (let col in docs) {
    let name = names.docs[col]['type']
    let schema = docs[col]
    schema.columns = schema.fields // doc schemas use 'fields' rather than 'columns'
    s += generateTypeFromSchema(name, schema, { level, names })
    s += `\n\n`
  } 
  return s
}

function generateGoogleDocFilterInputs(docs, { level, names }) {
  let s = ''
  for (let col in docs) {
    let name = names.docs[col]['input']
    let schema = docs[col]
    schema.columns = schema.fields // doc schemas use 'fields' rather than 'columns'
    s += generateInputFromSchema(name, schema, { level, names })
    s += `\n\n`
  } 
  return s
}

function generateGoogleDocSortInputs(docs, { level, names }) {
  let s = ''
  for (let col in docs) {
    let name = names.docs[col]['sort']
    s += generateSortInput(name, { level, names })
    s += `\n\n`
  }
  return s
}

function generateInputField(field, { level, names }) {
  return `${indent(level)}${field.name}: ${convertToQueryOperator(field, { names })}`
}

function generateConnectionType(name, { level, names }) {
  let s = `${indent(level)}type ${name} {\n`
  s += `${indent(level+1)}rows: [${names['edge']}!]\n`
  s += `${indent(level+1)}totalCount: Int!\n`
  s += `${indent(level+1)}pageInfo: PageInfo!\n` 
  // Not supported yet
  // s += `  distinct: Boolean\n` 
  // s += `  group [${name}GroupConnection]\n`
  s += `${indent(level)}}`
  return s
}

function generateEdgeType(name, { level, names }) {
  let s = `${indent(level)}type ${name} {\n`
  s += `${indent(level+1)}row: ${names['type']}!\n`
  // Not supported yet
  // s += `  next: ...?!\n`
  // s += `  previous: ...?!\n`
  s += `${indent(level)}}`
  return s
}

function generateSortInput(name, { level, names }) {
  let s = `${indent(level)}input ${name} {\n`
  s += `${indent(level+1)}fields: [${names['enumfields']}]\n`
  s += `${indent(level+1)}order: [SortOrderEnum]\n`
  s += `${indent(level)}}`
  return s
}


function generateTypeField(field, { level, names }) {
  let gqlType = convertToGraphQLType(field, { names })
  switch(gqlType) {
    case "Date":
    case "Datetime":
      return generateGraphQLDateField(field, { level, names })
    default:
      return `${indent(level)}${field.name}: ${gqlType}`
  }
}

function generateGraphQLDateField({ name, datatype, sample }, { level, names }) {
  let s = `${indent(level)}${name}(\n`
  s += `${indent(level+1)}formatString: String\n`
  s += `${indent(level+1)}fromNow: Boolean\n`
  s += `${indent(level+1)}difference: String\n`
  s += `${indent(level+1)}locale: String\n`
  s += `${indent(level+1)}zone: String\n`
  s += `${indent(level)}): ${convertToGraphQLType({ name, datatype, sample }, { names })}`
  return s
}

function convertToGraphQLType({ name, datatype }, { names }) {
  // kind of hacky. load should actually set the datatype to be ID
  if (name == "_id") {
    return 'ID!'
  }
  switch(datatype) {
    case "String":
      return 'String'
    case "Int":
      return 'Int'
    case "Float":
      return 'Float'
    case "Boolean":
      return "Boolean"
    case "Date":
      return "Date"
    case "Datetime":
      return "Datetime"
    case "StringList":
      return "[String]"
    case "GoogleDoc":
      return `${names.docs[name]['type']}`
    case "PlainText": 
      return 'String'
    case "Markdown":
      return 'String'
    case "GoogleJSON":
      return 'String'
  }
}

function convertToQueryOperator({ name, datatype }, { names }) {
  switch(datatype) {
    case "String":
      return 'StringQueryOperatorInput'
    case "Int":
      return 'IntQueryOperatorInput'
    case "Float":
      return 'FloatQueryOperatorInput'
    case "Boolean":
      return "BooleanQueryOperatorInput "
    case "Date":
      return "DateQueryOperatorInput"
    case "Datetime":
      return "DatetimeQueryOperatorInput"
    case "StringList":
      return "StringArrayQueryOperatorInput"
    case "GoogleDoc":
      return `${names.docs[name]['input']}`
    case "PlainText": 
      return 'StringQueryOperatorInput'
    case "Markdown":
      return 'StringQueryOperatorInput'
    case "GoogleJSON":
      return 'StringQueryOperatorInput'
  }
}


module.exports = {
  generateGraphQLNames,
  generateFindQuery,
  generateFindOneQuery,
  generate,
  generateTypeFromSchema,
  generateEnumFromSchema,
  generateTypeField,
  generateInputField
}

