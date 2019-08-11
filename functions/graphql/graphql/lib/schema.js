const path = require('path')
const fs = require('fs')
const { gql } = require('apollo-server-lambda')
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
}

function createQuery(args) {
  let query = { }
  if (args.filter) {
    query = formatOperators(args.filter)
  }
  return { query }
}

async function findResolver(parent, args, context, info) {
  let id = context.event.pathParameters.spreadsheetid
  let query = createQuery(args)
  return await makeRequest(id, query)
}

async function findOneResolver(parent, args, context, info) {
  let id = context.event.pathParameters.spreadsheetid
  let query = createQuery(args)
  query.one = true
  return await makeRequest(id, query)
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
  'expr', 'jsonSchema', 'mod', 'regex', 'text', 'where',
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
        formatted[addDollarIfOperator(k)] = formatOperators(filter[k])
        break
      default:
        formatted[addDollarIfOperator(k)] = filter[k]
    }
  }
  return formatted
}

module.exports = {
  fetchSchema
}