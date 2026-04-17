require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const lineConfig = require('../config/line-config');
const webhookController = require('./controllers/webhook-controller');
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
  logger.log('Health check accessed');
  res.json({
    status: 'OK',
    message: 'GGRSM LINE Chatbot is running',
    timestamp: new Date().toISOString()
  });
});

// Webhook test endpoint for LINE verification
app.get('/webhook', (req, res) => {
  logger.log('Webhook GET request received');
  res.json({
    status: 'Webhook endpoint active',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
});

// Conditional middleware - only apply LINE middleware for POST requests with proper headers
app.use('/webhook', (req, res, next) => {
  if (req.method === 'POST') {
    // Apply LINE middleware for POST requests
    middleware(lineConfig)(req, res, next);
  } else {
    // Skip LINE middleware for GET/other requests
    next();
  }
});

// Webhook endpoint for LINE
app.post('/webhook', webhookController.handleWebhook);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.log('Error occurred:', err.message);
  console.error(err.stack);

  // Always return 200 for LINE webhook to prevent retries
  if (req.path === '/webhook') {
    res.status(200).json({
      status: 'error handled',
      message: 'Error processed but returning 200 for LINE compatibility'
    });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 404 handler
app.use((req, res) => {
  logger.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Start server
app.listen(port, () => {
  logger.log(`Server is running on port ${port}`);
  logger.log(`Webhook URL: ${process.env.VERCEL_URL || `http://localhost:${port}`}/webhook`);
});

module.exports = app;