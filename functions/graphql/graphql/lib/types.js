const path = require('path')
const fs = require('fs')
const { gql } = require('apollo-server-lambda')

const schemastr = fs.readFileSync(path.join(__dirname, 'schema.graphql'))
module.exports = gql`${schemastr}`