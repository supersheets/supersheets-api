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
        find (filter: { letter: { eq: "A" } }) { 
          edges {
            node {
              letter
              number
              float
              date
              datetime
            }
          }
        } 
      }` 
    })
    expect(result.data).toMatchObject({
      find: {
        edges: [ {
          node: {
            "letter": "A",
            "number": 1,
            "float": 1,
            "date": "1979-05-16",
            "datetime": "1979-05-16T21:01:23.000Z",
            "__typename": "Row"
          }
        } ]
      } 
    })
  })
})
