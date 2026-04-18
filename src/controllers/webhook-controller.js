const { Client } = require('@line/bot-sdk');
const lineConfig = require('../../config/line-config');
const messageProcessor = require('../services/enhanced-message-processor');
const logger = require('../utils/logger');

// Initialize LINE client
const client = new Client(lineConfig);

const handleWebhook = async (req, res) => {
  try {
    logger.log('Webhook request received');
    logger.log('Request headers:', JSON.stringify(req.headers, null, 2));
    logger.log('Request body:', JSON.stringify(req.body, null, 2));

    if (!req.body || !req.body.events) {
      logger.log('Invalid webhook body - missing events');
      return res.status(200).json({ status: 'OK' });
    }

    const events = req.body.events;

    if (events.length === 0) {
      logger.log('No events to process');
      return res.status(200).json({ status: 'OK' });
    }

    // Process events FIRST (Vercel serverless kills function after response is sent)
    for (const event of events) {
      try {
        await processEvent(event);
      } catch (eventError) {
        logger.log('Error processing individual event:', eventError.message);
        console.error(eventError);
      }
    }

    return res.status(200).json({ status: 'OK' });

  } catch (error) {
    logger.log('Webhook processing error:', error.message);
    console.error('Webhook Error:', error);

    if (!res.headersSent) {
      res.status(200).json({
        status: 'error handled',
        message: 'Error processed but returning 200 for LINE compatibility'
      });
    }
  }
};

const processEvent = async (event) => {
  try {
    logger.log(`Processing event type: ${event.type}`);

    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const userId = event.source.userId;
      const replyToken = event.replyToken;

      logger.log(`Message from ${userId}: ${userMessage}`);

      const response = await messageProcessor.processMessage(userMessage, userId);

      if (response) {
        await client.replyMessage(replyToken, {
          type: 'text',
          text: response
        });

        logger.log(`Reply sent: ${response}`);
      }
    } else if (event.type === 'follow') {
      const welcomeMessage = messageProcessor.getWelcomeMessage();
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: welcomeMessage
      });

      logger.log('Welcome message sent to new follower');
    } else {
      logger.log(`Unhandled event type: ${event.type}`);
    }

  } catch (error) {
    logger.log('Event processing error:', error.message);
    console.error('Process Event Error:', error);
    throw error;
  }
};

module.exports = {
  handleWebhook
};
