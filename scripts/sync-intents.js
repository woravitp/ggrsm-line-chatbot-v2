/**
 * Zip ./dialogflow-agent and restore it into the Dialogflow project.
 * Usage:   npm run sync-intents
 * CI:      see .github/workflows/sync-dialogflow.yml
 */
require('dotenv').config();
const { AgentsClient } = require('@google-cloud/dialogflow');
const { readFileSync, writeFileSync } = require('node:fs');
const { execSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  DIALOGFLOW_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS_B64,
} = process.env;

if (!DIALOGFLOW_PROJECT_ID || !GOOGLE_APPLICATION_CREDENTIALS_B64) {
  console.error('Missing DIALOGFLOW_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS_B64');
  process.exit(1);
}

const credentials = JSON.parse(
  Buffer.from(GOOGLE_APPLICATION_CREDENTIALS_B64, 'base64').toString('utf-8'),
);

const zipPath = join(tmpdir(), `agent-${Date.now()}.zip`);
execSync(`cd dialogflow-agent && zip -r "${zipPath}" .`, { stdio: 'inherit' });

const agents = new AgentsClient({ credentials });

(async () => {
  const [operation] = await agents.restoreAgent({
    parent: `projects/${DIALOGFLOW_PROJECT_ID}`,
    agentContent: readFileSync(zipPath),
  });
  await operation.promise();
  console.log('Dialogflow agent restored from ./dialogflow-agent');
})();
