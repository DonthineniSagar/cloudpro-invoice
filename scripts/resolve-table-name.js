#!/usr/bin/env node
// Resolves the DynamoDB CompanyProfile table name from the AppSync API URL in amplify_outputs.json.
// Extracts the API ID directly from the URL — no AWS API calls needed.

const fs = require('fs');

try {
  const outputs = JSON.parse(fs.readFileSync('amplify_outputs.json', 'utf8'));
  const url = outputs?.data?.url;

  if (!url) {
    console.log('No AppSync URL found in amplify_outputs.json, skipping table resolution');
    process.exit(0);
  }

  // URL format: https://<apiId>.appsync-api.<region>.amazonaws.com/graphql
  const match = url.match(/^https:\/\/([a-z0-9]+)\.appsync-api\./);
  if (!match) {
    console.log('Could not extract API ID from URL:', url);
    process.exit(0);
  }

  const apiId = match[1];
  const tableName = `CompanyProfile-${apiId}-NONE`;
  console.log(`Resolved COMPANY_PROFILE_TABLE_NAME=${tableName}`);

  const envFile = '.env.local';
  const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  if (!existing.includes('COMPANY_PROFILE_TABLE_NAME')) {
    fs.appendFileSync(envFile, `\nCOMPANY_PROFILE_TABLE_NAME=${tableName}\n`);
    console.log('Appended to .env.local');
  }
} catch (err) {
  console.error('Failed to resolve table name:', err.message);
}
