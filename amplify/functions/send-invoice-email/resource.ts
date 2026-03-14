import { defineFunction } from '@aws-amplify/backend';

export const sendInvoiceEmail = defineFunction({
  name: 'send-invoice-email',
  entry: './handler.ts',
  environment: {
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'testing@cloudpro-digital.co.nz',
  },
  timeoutSeconds: 30,
});
