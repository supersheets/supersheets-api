require('dotenv').config()
// https://www.apollographql.com/docs/tutorial/client/#apollo-client-setup
const { ApolloClient } = require('apollo-client')
const { InMemoryCache } = require('apollo-cache-inmemory')
const { HttpLink } = require('apollo-link-http')
const fetch = require('node-fetch')
const gql = require('graphql-tag')

describe('Client', () => {
  let client = null
  beforeEach(async () => {
    const cache = new InMemoryCache();
    const link = new HttpLink({
      uri: process.env.GRAPHQL_ENDPOINT,
      fetch
    })
    client = new ApolloClient({
      cache,
      link
    })
  })
  afterEach(async () => {
  })
  it ('should run query using the client', async () => {
    let result = await client.query({ query: gql`
      { 
        find (filter: { letter: { eq: "A" } } ) { 
          letter
          number
          floast
          date
          datetime
        } 
      }` 
    })
    console.log(result)
  })
})
