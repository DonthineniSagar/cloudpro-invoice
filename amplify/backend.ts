import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { sendInvoiceEmail } from './functions/send-invoice-email/resource';
import { processReceipt } from './functions/process-receipt/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tags } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,
  data,
  storage,
  sendInvoiceEmail,
  processReceipt,
});

// Tag all resources
const stack = backend.createStack('tags');
Tags.of(stack.node.root).add('app', 'cloudpro-invoice');
Tags.of(stack.node.root).add('project', 'cloudpro');
Tags.of(stack.node.root).add('managed-by', 'amplify');

// Grant SES send permissions to the function
backend.sendInvoiceEmail.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['arn:aws:ses:ap-southeast-2:*:identity/*'],
  })
);

// Grant Textract permissions to the receipt processor
backend.processReceipt.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['textract:AnalyzeExpense'],
    resources: ['*'],
  })
);

export { backend };
