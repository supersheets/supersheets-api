const path = require('path')
const fs = require('fs')
const { gql } = require('apollo-server-lambda')
const { GraphQLScalarType } = require('graphql') 
const axios = require('axios')

// in the future this should probably make a request out 
// to GET {spreadsheetid}/graphql/schema which returns 
// back the schema definitions 
// For now we just read it from a local file
async function fetchSchema(id) {
  let request = axios.create({
    baseURL: process.env.SUPERSHEETS_BASE_URL,
    headers: {
      "Content-Type": "application/json"
    }
  })
  let res = (await request.get(`${id}/graphql/schema`)).data
  console.log("schema", res.schema)
  const schemastr = res.schema
  let typeDefs =  gql`${schemastr}`
  return { typeDefs, resolvers }
}

// All the resolvers need to do is translate the query to
// something we can use to make a http find request 
const resolvers = {
  Query: {
    find: findResolver,
    findOne: findOneResolver
  },
  Date: dateScalarType()
}

function createQuery(args) {
  let find = { query: { } }
  if (args.filter) {
    find.query = formatFieldNames(formatOperators(args.filter))
  }
  if (args.skip) {
    find.skip = args.skip
  }
  if (args.limit) {
    find.limit = args.limit
  }
  if (args.sort) {
    find.sort = formatSort(args.sort)
  }
  return find
}

async function findResolver(parent, args, context, info) {
  let id = context.event.pathParameters.spreadsheetid
  let query = createQuery(args)
  console.log(`find: ${JSON.stringify(query, null, 2)}`)
  return await makeRequest(id, query)
}

async function findOneResolver(parent, args, context, info) {
  let id = context.event.pathParameters.spreadsheetid
  let query = createQuery(args)
  query.one = true
  console.log(`findOne: ${JSON.stringify(query, null, 2)}`)
  return await makeRequest(id, query)
}

function dateScalarType() {
  return new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return value // value from the client
    },
    serialize(value) {
      return value.split('T')[0]; // "2019-08-01" 
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value) // ast value is always in string format
      }
      return null;
    },
  })
}

async function makeRequest(id, query) {
  let request = axios.create({
    baseURL: process.env.SUPERSHEETS_BASE_URL,
    headers: {
      "Content-Type": "application/json"
    }
  })
  let data = (await request.post(`${id}/find`, query)).data
  return data.result
}

// https://docs.mongodb.com/manual/reference/operator/query/
const OPERATORS = [
  // Comparison
  'eq', 'gt', 'gte', 'in', 'lt', 'lte', 'ne', 'nin',
  // Logical
  'and', 'not', 'nor', 'or',
  // Element
  'exists', 'type',
  // Evaluation
  'expr', 'jsonSchema', 'mod', 'regex', 'options', 'text', 'where',
  // Geospatial
  'geoIntersects', 'geoWithin', 'near', 'nearSphere',
  // Array
  'all', 'elemMatch', 'size',
  // Bitwise
  'bitsAllClear', 'bitsAllSet$bitsAnyClear$bitsAnySet',
  // Comments
  'comment',
  // Projection
  // '$' not sure how to support his
  'elemMatch', 'meta', 'slice'
]

function addDollarIfOperator(k) {
  return OPERATORS.includes(k) && `$${k}` || k
}

function formatOperators(filter) {
  let formatted = { }
  for (let k in filter) {
    switch (typeof filter[k]) {
      case "object": 
        if (Array.isArray(filter[k])) {
          formatted[addDollarIfOperator(k)] = filter[k]
        } else {
          formatted[addDollarIfOperator(k)] = formatOperators(filter[k])
        }
        break
      default:
        formatted[addDollarIfOperator(k)] = filter[k]
    }
  }
  return formatted
}

function formatFieldNames(filter) {
  let formatted = { }
  for (let k in filter) {
    switch (typeof filter[k]) {
      case "object": 
        if (Array.isArray(filter[k])) {
          formatted[dotNotation(k)] = filter[k]
        } else {
          formatted[dotNotation(k)] = formatFieldNames(filter[k])
        }
        break
      default:
        formatted[dotNotation(k)] = filter[k]
    }
  }
  return formatted
}

function dotNotation(k) {
  if (k && k.includes("__")) {
    return k.replace(/__/g, '.')
  }
  return k
}

// { fields: [ ], order: [ 'ASC', 'DESC' ] } => [ [ field1, asc ], [ field2, desc ] ]
function formatSort(sort) {
  let formatted = [ ]
  for (let i = 0; i<sort.fields.length; i++) {
    formatted.push([ sort.fields[i], (sort.order[i] || 'ASC') ])
  }
  return formatted
}

module.exports = {
  fetchSchema
}