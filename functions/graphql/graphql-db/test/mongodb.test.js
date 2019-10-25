require('dotenv').config()
// Supersheets Public GraphQL Test
// https://docs.google.com/spreadsheets/d/1hCmRdgeWAnPEEzK-GHKdJDNjRZdhUHaKQKJ2IX7fTVI/edit#gid=0
const fs = require('fs')
const path = require('path')
const {   
  createQuery,
  formatFieldNames,
  formatOperators,
  formatSort } = require('../lib/mongodb')

describe('createQuery', () => {
  it ('should format a graphql query to a mongodb query', async () => {
    let args = {
      filter: { "hello": { "eq": "world" }, "foo___bar": { "lt": 1 } },
      skip: 1,
      limit: 2,
      sort: { "fields": [ "hello", "world" ], "order": [ "DESC", "ASC" ] }
    }
    let query = createQuery(args)
    expect(query).toEqual({
      query: { "hello": { "$eq": "world" }, "foo.bar": { "$lt": 1 } },
      options: {
        skip: 1,
        limit: 2,
        sort: [ [ "hello", "DESC" ], [ "world", "ASC" ] ]
      }
    })
  })
})

describe('formatFieldNames', () => {
  it ('should resolve underscores to dot notation', async () => {
    let filter = { "hello": "world", "foo___bar": "something" }
    let formatted = formatFieldNames(filter)
    expect(formatted).toEqual({
      "hello": "world",
      "foo.bar": "something"
    })
  })
  it ('should format nested to dot notation', async () => {
    let filter = { "foo___bar": { "good___bad": "something" } }
    let formatted = formatFieldNames(filter)
    expect(formatted).toEqual({
      "foo.bar": {
        "good.bad": "something"
      }
    })
  })
  it ('should format double underscore', async () => {
    let filter = { "hello___foo___bar": "something" }
    let formatted = formatFieldNames(filter)
    expect(formatted).toEqual({
      "hello.foo.bar": "something"
    })
  })
  it ('should treat date value as literal even though its an object', async () => {
    let d = new Date()
    let filter = { "foo___bar": d }
    let formatted = formatFieldNames(filter)
    expect(formatted).toEqual({
      "foo.bar": d
    })
  })
  it ('should treat arrays as literal even though its an object', async () => {
    let filter = { "foo___bar": [ 1, 2, 3 ] }
    let formatted = formatFieldNames(filter)
    expect(formatted).toEqual({
      "foo.bar": [ 1, 2, 3 ]
    })
  })
})

describe('formatOperators', () => {
  it ('should add $ to operators', async () => {
    let filter = { "eq": "hello", "world": "eq" }
    let formatted = formatOperators(filter)
    expect(formatted).toEqual({
      "$eq": "hello",
      "world": "eq"
    })
  })
  it ('should add $ to nested operators', async () => {
    let filter = { "eq": "hello", "world": { "lt": 1 } }
    let formatted = formatOperators(filter)
    expect(formatted).toEqual({
      "$eq": "hello",
      "world": {
        "$lt": 1
      }
    })
  })
  it ('should treat date value as literal even though its an object', async () => {
    let d = new Date()
    let filter = { "eq": d }
    let formatted = formatOperators(filter)
    expect(formatted).toEqual({
      "$eq": d
    })
  })
  it ('should treat arrays as literal even though its an object', async () => {
    let filter = { "eq": [ 1, 2, 3 ] }
    let formatted = formatOperators(filter)
    expect(formatted).toEqual({
      "$eq": [ 1, 2, 3 ]
    })
  })
})

describe('formatSort', () => {
  it ('should format graphql sort into mongodb sort', async () => {
    let sort = { "fields": [ "hello", "world" ], "order": [ "DESC", "ASC" ] }
    let formatted = formatSort(sort)
    expect(formatted).toEqual([
      [ "hello", "DESC" ],
      [ "world", "ASC" ]
    ])
  })
  it ('should default to ASC if order value not provided', async () => {
    let sort = { "fields": [ "hello", "world" ], "order": [ "DESC" ] }
    let formatted = formatSort(sort)
    expect(formatted).toEqual([
      [ "hello", "DESC" ],
      [ "world", "ASC" ]
    ])
  })
  it ('should default to ASC if order property missing completely', async () => {
    let sort = { "fields": [ "hello", "world" ] }
    let formatted = formatSort(sort)
    expect(formatted).toEqual([
      [ "hello", "ASC" ],
      [ "world", "ASC" ]
    ])
  })
  it ('should support embedded field sort', async () => {
    let sort = { "fields": [ "hello___world" ] }
    let formatted = formatSort(sort)
    expect(formatted).toEqual([
      [ "hello.world", "ASC" ]
    ])
  })
})