const logger = require('../src/utils/logger');

// Validate required environment variables
const requiredEnvVars = [
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.log('Missing required environment variables:', missingVars.join(', '));
  console.error('Missing environment variables:', missingVars);
  process.exit(1);
}

const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

logger.log('LINE configuration loaded successfully');
logger.log(`Channel ID: ${config.channelId}`);

module.exports = config;