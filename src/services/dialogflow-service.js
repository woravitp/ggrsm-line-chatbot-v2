const { SessionsClient } = require('@google-cloud/dialogflow');
const logger = require('../utils/logger');

const {
  DIALOGFLOW_PROJECT_ID,
  DIALOGFLOW_LANGUAGE_CODE = 'th',
  GOOGLE_APPLICATION_CREDENTIALS_B64,
} = process.env;

let client = null;

const getClient = () => {
  if (client) return client;
  if (!DIALOGFLOW_PROJECT_ID || !GOOGLE_APPLICATION_CREDENTIALS_B64) {
    throw new Error(
      'Dialogflow not configured. Set DIALOGFLOW_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS_B64.',
    );
  }
  const credentials = JSON.parse(
    Buffer.from(GOOGLE_APPLICATION_CREDENTIALS_B64, 'base64').toString('utf-8'),
  );
  client = new SessionsClient({ credentials });
  return client;
};

const detectIntent = async (text, sessionId) => {
  const sc = getClient();
  const sessionPath = sc.projectAgentSessionPath(DIALOGFLOW_PROJECT_ID, sessionId);

  const [response] = await sc.detectIntent({
    session: sessionPath,
    queryInput: {
      text: { text, languageCode: DIALOGFLOW_LANGUAGE_CODE },
    },
  });

  const qr = response.queryResult || {};
  const parameters = qr.parameters?.fields
    ? Object.fromEntries(
        Object.entries(qr.parameters.fields).map(([k, v]) => [k, decodeValue(v)]),
      )
    : {};

  const result = {
    intent: qr.intent?.displayName || '',
    confidence: qr.intentDetectionConfidence || 0,
    fulfillmentText: qr.fulfillmentText || '',
    parameters,
    isFallback: qr.intent?.isFallback || false,
  };

  logger.log(
    `Dialogflow: intent=${result.intent} conf=${result.confidence.toFixed(2)} fallback=${result.isFallback}`,
  );
  return result;
};

// Convert protobuf Value → plain JS
const decodeValue = (v) => {
  if (v.stringValue !== undefined && v.stringValue !== '') return v.stringValue;
  if (v.numberValue !== undefined && v.numberValue !== 0) return v.numberValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.listValue) return (v.listValue.values || []).map(decodeValue);
  if (v.structValue?.fields) {
    return Object.fromEntries(
      Object.entries(v.structValue.fields).map(([k, val]) => [k, decodeValue(val)]),
    );
  }
  return v.stringValue || '';
};

module.exports = { detectIntent };
