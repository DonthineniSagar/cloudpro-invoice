import { defineFunction } from '@aws-amplify/backend';

export const processReceipt = defineFunction({
  name: 'process-receipt',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
});
