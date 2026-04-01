import { defineFunction } from '@aws-amplify/backend';

export const processExpenseEmail = defineFunction({
  name: 'process-expense-email',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: 'data',
  environment: {
    EXPENSE_TABLE_NAME: process.env.EXPENSE_TABLE_NAME || '',
    COMPANY_PROFILE_TABLE_NAME: process.env.COMPANY_PROFILE_TABLE_NAME || '',
    BEDROCK_MODEL_ID: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  },
});
