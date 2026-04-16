#!/usr/bin/env node
// Resolves the DynamoDB CompanyProfile table name from the AppSync API URL in amplify_outputs.json.
// Runs during Amplify build (after ampx pipeline-deploy) to set COMPANY_PROFILE_TABLE_NAME.

const fs = require('fs');
const { execSync } = require('child_process');

try {
  const outputs = JSON.parse(fs.readFileSync('amplify_outputs.json', 'utf8'));
  const url = outputs?.data?.url;
  const region = outputs?.data?.aws_region || 'ap-southeast-2';

  if (!url) {
    console.log('No AppSync URL found in amplify_outputs.json, skipping table resolution');
    process.exit(0);
  }

  // Get the AppSync API ID by listing APIs and matching the URL
  const apisJson = execSync(
    `aws appsync list-graphql-apis --region ${region} --output json`,
    { encoding: 'utf8' }
  );
  const apis = JSON.parse(apisJson).graphqlApis || [];
  const api = apis.find(a => a.uris?.GRAPHQL === url);

  if (!api) {
    console.log('Could not find AppSync API matching URL:', url);
    process.exit(0);
  }

  const tableName = `CompanyProfile-${api.apiId}-NONE`;
  console.log(`Resolved COMPANY_PROFILE_TABLE_NAME=${tableName}`);

  // Append to .env.local (Amplify already creates this with app-level env vars)
  const envFile = '.env.local';
  const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  if (!existing.includes('COMPANY_PROFILE_TABLE_NAME')) {
    fs.appendFileSync(envFile, `\nCOMPANY_PROFILE_TABLE_NAME=${tableName}\n`);
    console.log('Appended to .env.local');
  }
} catch (err) {
  console.error('Failed to resolve table name:', err.message);
  // Non-fatal — falls back to env var or default
}
