function generate(metadata, options) {
  options = options || { }
  // var schema = new GraphQLSchema({
  //   query: generateQuery(metadata, options)
  // })
  // return printSchema(schema)
  let s = `schema {\n  query: Query\n}\n`
  s += `\n`
  s += generateQuery(metadata, options)
  s += `\n`
  s += generateDoc(metadata, options)
  s += `\n`
  s += generateGoogleDocTypes(metadata, options)
  s += `\n`
  s += generateFieldsEnum(metadata, options)
  s += `\n`
  s += generateFilterInput(metadata, options)
  s += `\n`
  s += generateGoogleDocFilterInputs(metadata, options)
  s += `\n`
  s += generateSortInput(metadata, options)
  s += `\n`
  s += generateStaticTypeDefs()
  s += `\n`
  return s
}

/*
type Query {
  find(filter: FilterInput, limit: Int, skip: Int, sort: SortInput): [Doc!]
  findOne(filter: FilterInput, limit: Int, skip: Int, sort: SortInput): Doc
}
*/
function generateQuery(metadata, options) {
  options = options || { }
  let name = options.name || "Doc"
  let s = `type Query {\n`
  s += `  find(filter: ${name}FilterInput, limit: Int, skip: Int, sort: SortInput): [${name}!]\n`
  s += `  findOne(filter: ${name}FilterInput, limit: Int, skip: Int, sort: SortInput): ${name}!\n`
  s += `}\n`
  return s
}

/*
type Doc {
  _id: ID!
  _sheet: String!
  _row: Int!
  letter: String!
  value: Int!
}
*/
function generateDoc(metadata, options) {
  options = options || { }
  let name = options.name || "Doc"
  let s = `type ${name} {\n`
  s += `  _id: ID!\n`
  s += `  _sheet: String!\n`
  s += `  _row: Int!\n`
  for (let col of metadata.schema.columns) {
    s += `  ${col.name}: ${convertToGraphQLType(col)}\n`
  }
  s += '}\n'
  return s
}

function generateGoogleDocTypes(metadata) {
  let s = ''
  for (let col in metadata.schema.docs) {
    let schema = metadata.schema.docs[col]
    s = `type ${schema.name}Doc {\n`
    for (let col of schema.columns) {
      s += `  ${col.name}: ${convertToGraphQLType(col)}!\n`
    } 
    s += '}\n'
  }
  return s
}

function convertToGraphQLType({ name, datatype, sample }) {
  const isInt = (n) => { return parseInt(n) === n }
  switch(datatype) {
    case "String":
      return 'String'
    case "Number": 
      return isInt(sample) && 'Int' || 'Float'
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
      return `${name}Doc`
  }
}

/*
enum FieldsEnum {
  _id
  _sheet
  _row
  letter
  value
}
*/
function generateFieldsEnum(metadata, options) {
  options = options || { }
  let name = `${options.name || "Doc"}FieldsEnum`
  let values = {
    "_id": { value: "_id" },
    "_sheet": { value: "_sheet" },
    "_row": { value: "_row" }
  }
  let s = `enum ${name} {\n`
  s += `  _id\n`
  s += `  _sheet\n`
  s += `  _row\n`
  for (let col of metadata.schema.columns) {
    s += `  ${col.name}\n`
  }
  s += `}\n`
  return s
}

/*
input FilterInput {
  _id: StringQueryOperatorInput
  _sheet: StringQueryOperatorInput
  _row: IntQueryOperatorInput
  letter: StringQueryOperatorInput
  value: IntQueryOperatorInput
}
*/
function generateFilterInput(metadata, options) {
  options = options || { }
  let name = `${options.name || "Doc"}FilterInput`
  let s = `input ${name} {\n`
  s += `  _id: StringQueryOperatorInput\n`
  s += `  _sheet: StringQueryOperatorInput\n`
  s += `  _row: IntQueryOperatorInput\n`
  for (let col of metadata.schema.columns) {
    s += `  ${col.name}: ${convertToQueryOperator(col)}\n`
  }
  for (let col in metadata.schema.docs) {
    let docschema = metadata.schema.docs[col]
    for (let doccol of docschema.columns) {
      s += `  ${col}__${doccol.name}: ${convertToQueryOperator(doccol)}\n`
    }
  }
  s += `}\n`
  return s
}

function generateGoogleDocFilterInputs(metadata) {
  let s = ''
  for (let col in metadata.schema.docs) {
    let schema = metadata.schema.docs[col]
    s = `input ${schema.name}FilterInput {\n`
    for (let col of schema.columns) {
      s += `  ${col.name}: ${convertToGraphQLType(col)}\n`
    } 
    s += '}\n'
  }
  return s
}

function convertToQueryOperator({ name, datatype, sample }) {
  const isInt = (n) => { return parseInt(n) === n }
  switch(datatype) {
    case "String":
      return 'StringQueryOperatorInput'
    case "Number": 
      return isInt(sample) && 'IntQueryOperatorInput' || 'FloatQueryOperatorInput'
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
      return `${name}FilterInput`
  }
}

/*
input SortInput {
  fields: [FieldsEnum]
  order: [SortOrderEnum]
}
*/
function generateSortInput(metadata, options) {
  options = options || { }
  let name = options.name || "Doc"
  let s = `input SortInput {\n`
  s += `  fields: [${name}FieldsEnum]\n`
  s += `  order: [SortOrderEnum]\n`
  s += `}\n`
  return s
}

function generateStaticTypeDefs() {
  return `scalar Date
scalar Datetime

enum SortOrderEnum {
  ASC
  DESC
}

input StringArrayQueryOperatorInput {
  eq: String
  ne: String
  in: [String]
  nin: [String]
  all: [String]
  elemMatch: [StringQueryOperatorInput]
  size: Int
}

input StringQueryOperatorInput {
  eq: String
  gt: String
  gte: String
  lt: String
  lte: String
  in: [String]
  ne: String
  nin: [String]
  regex: String
  options: String
}

input IntQueryOperatorInput {
  eq: Int
  gt: Int
  gte: Int
  in: [Int]
  lt: Int
  lte: Int
  ne: Int
  nin: [Int]
}

input FloatQueryOperatorInput {
  eq: Float
  gt: Float
  gte: Float
  in: [Float]
  lt: Float
  lte: Float
  ne: Float
  nin: [Float]
}

input BooleanQueryOperatorInput {
  eq: Boolean
  ne: Boolean
  in: [ Boolean ]
  nin: [ Boolean ]
}

input DateQueryOperatorInput {
  eq: Date
  no: Date
  gt: Date
  gte: Date
  lt: Date
  lte: Date
  in: [ Date ]
  nin: [ Date ]
}

input DatetimeQueryOperatorInput {
  eq: Datetime
  no: Datetime
  gt: Datetime
  gte: Datetime
  lt: Datetime
  lte: Datetime
  in: [ Datetime ]
  nin: [ Datetime ]
}
`
}

module.exports = {
  generate,
  generateDoc
}

/*
metadata.schema.columns:

[
  {"name":"letter","datatype":"String","sample":"A","sheets":["data"]},
  {"name":"value","datatype":"Number","sample":65,"sheets":["data"]}
]
*/