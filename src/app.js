// src/app.js
// Sets up the Express app and mounts all routes.
// Exported separately from server.js so tests can import the app
// without actually binding to a port.

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const { router: courierRouter } = require('./routes/couriers');
const shiftRouter = require('./routes/shifts');
const walletRouter = require('./routes/wallet');
const orderRouter = require('./routes/orders');
const messageRouter = require('./routes/messages');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'Nkwa Delivery Buddy API', status: 'ok', docs: '/api-docs' });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/couriers', courierRouter);
app.use('/api/shifts', shiftRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/orders', orderRouter);
// messages routes are nested under /api/orders/:id/messages
app.use('/api/orders', messageRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler (catches anything thrown/passed to next(err))
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
