import { defineFunction } from '@aws-amplify/backend';

export const sendInvoiceEmail = defineFunction({
  name: 'send-invoice-email',
  entry: './handler.ts',
  runtime: 20,
  environment: {
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'billing@cloudpro-digital.co.nz',
  },
  timeoutSeconds: 30,
});
