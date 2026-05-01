import { defineFunction } from '@aws-amplify/backend';

export const stripeWebhook = defineFunction({
  name: 'stripe-webhook',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: 'data',
});
