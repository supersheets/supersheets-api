require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { gql } = require('apollo-server-lambda')
const { buildSchema, printSchema } = require('graphql')
const { 
  generateGraphQLNames,
  generateFindQuery,
  generateFindOneQuery,
  generate, 
  generateSDL,
  generateSheetSchema,
  generateTypeField,
  generateInputField 
} = require('../lib/schema') 

describe('generateGraphQLNames', () => {
  let sheet = getTestSheet()
  let s = generateGraphQLNames(sheet)
  expect(s).toEqual({ 
    name: 'Posts',
    type: 'Posts',
    docs: { 
      "googledoc": { 
        name: 'googledoc',
        type: 'PostsGoogledocDoc',
        input: 'PostsGoogledocDocFilterInput',
        sort: 'PostsGoogledocDocSortInput'
      } 
    },
    connection: 'PostsConnection',
    enumfields: 'PostsFieldsEnum',
    edge: 'PostsEdge',
    input: 'PostsFilterInput',
    find: 'findPosts',
    findOne: 'findOnePosts',
    sort: 'PostsSortInput'
  })
})

describe('generateSheetSchema', () => {  
  let sheet = getTestSheet()
  let s = generateSheetSchema(sheet, { level: 0 })
  //console.log(s)
})

describe('generateTypeField', () => {
  it ('should generate an ID field', async () => {
    let field = { name: "_id" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual('_id: ID!')
  })
  it('should generate a standard field', async () => {
    let field = { name: "title", datatype: "String" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual('title: String')
  })
  it ('should generate a date field', async () => {
    let field = { name: "published", datatype: "Date" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual(`published(
    formatString: String
    fromNow: Boolean
    difference: String
    locale: String
    zone: String
): Date`)
  })
  it ('should generate a datetime field', async () => {
    let field = { name: "published", datatype: "Datetime" }
    let s = generateTypeField(field, { level: 0 })
    expect(s).toEqual(`published(
    formatString: String
    fromNow: Boolean
    difference: String
    locale: String
    zone: String
): Datetime`)
  })
  it ('should generate a GoogleDoc field', async () => {
    let field = { name: "content", datatype: "GoogleDoc" }
    let names = {
      docs: {
        "content": {
          type: 'ContentDoc'
        }
      }
    }
    let s = generateTypeField(field, { level: 0, names })
    expect(s).toEqual('content: ContentDoc')
  })
})

describe('generateFilterField', () => {
  it('should generate a standard field', async () => {
    let field = { name: "title", datatype: "String" }
    let s = generateInputField(field, { level: 0 })
    expect(s).toEqual('title: StringQueryOperatorInput')
  })
  it ('should generate a GoogleDoc field', async () => {
    let field = { name: "content", datatype: "GoogleDoc" }
    let names = {
      docs: {
        "content": {
          input: 'ContentDocFilterInput'
        }
      }
    }
    let s = generateInputField(field, { level: 0, names })
    expect(s).toEqual('content: ContentDocFilterInput')
  })
})

describe('generate queries', () => {
  it('should generate a find query', async () => {
    let sheet = getTestSheet()
    let names = generateGraphQLNames(sheet)
    let s = generateFindQuery(sheet, { level: 0, names })
    expect(s).toEqual(`findPosts(
    filter: PostsFilterInput
    limit: Int
    skip: Int
    sort: PostsSortInput
): PostsConnection`)
  })
  it('should generate a findOne query', async () => {
    let sheet = getTestSheet()
    let names = generateGraphQLNames(sheet)
    let s = generateFindOneQuery(sheet, { level: 0, names })
    expect(s).toEqual(`findOnePosts(
    filter: PostsFilterInput
    limit: Int
    skip: Int
    sort: PostsSortInput
): Posts`)
  })
})

describe('generate', () => {
  it ('should generate valid SDL', async () => {
    let sdl = generateSDL(getTestMetadata())
    //console.log(sdl)
    let error = null
    try {
      let parsed = gql`${sdl}`
    } catch (err) {
      console.error(err)
      error = err
    }
    expect(error).toBeFalsy()
  })
  it ('should generate a valid schema', async () => {
    let sdl = generateSDL(getTestMetadata())
    let error = null
    try {
      let schema = buildSchema(sdl)
      //console.log(printSchema(schema))
    } catch (err) {
      console.error(err)
      error = err
    }
    expect(error).toBeFalsy()
  })
})



function getTestSheet() {
  return getTestMetadata().sheets[0]
}

function getTestMetadata() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'metadata.json')).toString('utf8'))
}
