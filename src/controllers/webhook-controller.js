const handleWebhook = async (req, res) => {
  try {
    logger.log('Webhook request received');
    logger.log('Request headers:', JSON.stringify(req.headers, null, 2));
    logger.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate webhook body
    if (!req.body || !req.body.events) {
      logger.log('Invalid webhook body - missing events');
      return res.status(200).json({ status: 'OK' });
    }

    const events = req.body.events;
    if (events.length === 0) {
      logger.log('No events to process');
      return res.status(200).json({ status: 'OK' });
    }

    // Process events FIRST (before responding — Vercel kills function after response)
    for (const event of events) {
      try {
        await processEvent(event);
      } catch (eventError) {
        logger.log('Error processing individual event:', eventError.message);
        console.error(eventError);
      }
    }

    // Respond AFTER all processing done
    return res.status(200).json({ status: 'OK' });

  } catch (error) {
    logger.log('Webhook processing error:', error.message);
    console.error('Webhook Error:', error);
    if (!res.headersSent) {
      res.status(200).json({ status: 'error handled' });
    }
  }
};
