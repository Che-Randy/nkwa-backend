// src/swagger.js
// Builds the OpenAPI spec from the JSDoc comments in each route file.

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nkwa Delivery Buddy API',
      version: '1.0.0',
      description: 'Backend API for the Delivery Buddy courier app (Nkwa Backend Internship Assessment).'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local dev' }
    ]
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
