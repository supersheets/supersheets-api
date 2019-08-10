// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    find: (parent, args, context, info) => {
      console.log("Resolver args", JSON.stringify({ parent, args, context, info }, null, 2))
      return {
        results: [
          { 
            id: "myid",
            row: 2,
            sheet: "letters",
            letter: "A",
            value: 25
          }
        ]
      }
    }
  },
}

module.exports = resolvers