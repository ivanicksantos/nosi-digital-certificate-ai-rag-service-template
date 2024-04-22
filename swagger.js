const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "Digital Certificate Indexer API",
    "version": "1.0.0",
    "description": "API for indexing digital certificate data using Pinecone and Langchain."
  },
  "paths": {
    "/certificates-free": {
      "post": {
        "summary": "Index a new digital certificate",
        "description": "Adds a new digital certificate to the Pinecone index.",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "recipientName": { "type": "string" },
                  "recipientEmail": { "type": "string" },
                  "courseName": { "type": "string" },
                  "courseDescription": { "type": "string" },
                  "issueDate": { "type": "string" },
                  "pdfUrl": { "type": "string" },
                  "pngUrl": { "type": "string" }
                },
                "required": ["recipientName", "recipientEmail", "courseName", "issueDate", "pdfUrl", "pngUrl"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Operation"
          },
          "400": {
            "description": "Invalid input"
          }
        }
      }
    },
    "/query-certificates-free": {
      "get": {
        "summary": "Query a digital certificate",
        "description": "Query a digital certificate in the Pinecone index.",
        "parameters": [
          {
            "in": "query",
            "name": "text",
            "required": false,
            "schema": {
              "type": "string"
            },
            "description": "Text content of the digital certificate to be indexed."
          }
        ],
        "requestBody": {
        },
        "responses": {
          "200": {
            "description": "Successful Operation"
          },
          "400": {
            "description": "Invalid input"
          }
        }
      }
    }
  }
}

export default swaggerDocument;
