import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { sendInvoiceEmail } from './functions/send-invoice-email/resource';
import { processReceipt } from './functions/process-receipt/resource';
import { processExpenseEmail } from './functions/process-expense-email/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

const backend = defineBackend({
  auth,
  data,
  storage,
  sendInvoiceEmail,
  processReceipt,
  processExpenseEmail,
});

// Enable WebAuthn/Passkey as a first-factor authentication method
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.addPropertyOverride('WebAuthnRelyingPartyID', 'cloudpro-digital.co.nz');
cfnUserPool.addPropertyOverride('WebAuthnUserVerification', 'preferred');

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

// Grant S3 access for PDF receipt processing (Textract needs S3 for PDFs)
const receiptFn = backend.processReceipt.resources.lambda as lambda.Function;
backend.storage.resources.bucket.grantReadWrite(receiptFn);
receiptFn.addEnvironment('STORAGE_BUCKET_NAME', backend.storage.resources.bucket.bucketName);

// === Expense Email Ingest Infrastructure ===
// Using data stack to avoid circular dependency between nested stacks
const dataStack = backend.data.resources.cfnResources.cfnGraphqlApi.stack;

// S3 bucket for storing raw inbound emails
const inboundEmailBucket = new s3.Bucket(dataStack, 'InboundEmailBucket', {
  bucketName: undefined, // auto-generated
  removalPolicy: RemovalPolicy.RETAIN,
  lifecycleRules: [{ expiration: Duration.days(30) }],
  encryption: s3.BucketEncryption.S3_MANAGED,
});

// Get DynamoDB table names from the data resource
const expenseTableName = backend.data.resources.tables['Expense'].tableName;
const companyProfileTableName = backend.data.resources.tables['CompanyProfile'].tableName;

// Grant the Lambda permissions
const processEmailLambda = backend.processExpenseEmail.resources.lambda;
const processEmailFn = processEmailLambda as lambda.Function;

inboundEmailBucket.grantRead(processEmailLambda);

// Grant write to main storage bucket for receipt uploads
const storageBucket = backend.storage.resources.bucket;
storageBucket.grantWrite(processEmailLambda);
processEmailFn.addEnvironment('STORAGE_BUCKET_NAME', storageBucket.bucketName);

processEmailLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['textract:AnalyzeExpense'],
    resources: ['*'],
  })
);

processEmailLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  })
);

processEmailLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:Scan'],
    resources: [
      backend.data.resources.tables['Expense'].tableArn,
      backend.data.resources.tables['CompanyProfile'].tableArn,
      `${backend.data.resources.tables['CompanyProfile'].tableArn}/index/*`,
    ],
  })
);

// Set environment variables on the Lambda
processEmailFn.addEnvironment('SES_BUCKET_NAME', inboundEmailBucket.bucketName);
processEmailFn.addEnvironment('EXPENSE_TABLE_NAME', expenseTableName);
processEmailFn.addEnvironment('COMPANY_PROFILE_TABLE_NAME', companyProfileTableName);
const notificationTableName = backend.data.resources.tables['Notification'].tableName;
processEmailFn.addEnvironment('NOTIFICATION_TABLE_NAME', notificationTableName);

// Grant Lambda write to Notification table
processEmailLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:PutItem'],
    resources: [backend.data.resources.tables['Notification'].tableArn],
  })
);

// SES Receipt Rule — receives emails and stores in S3, then triggers Lambda
// NOTE: You must verify your domain in SES and set up MX records before this works.
// Domain: expenses.cloudpro-digital.co.nz
// SES receipt rule set is created once and shared across branches (only one can be active per account).
// We import the existing rule set and add a rule pointing to this branch's Lambda + S3 bucket.
const ruleSet = ses.ReceiptRuleSet.fromReceiptRuleSetName(dataStack, 'ExpenseEmailRuleSet', 'cloudpro-expense-ingest');

ruleSet.addRule('ProcessExpenseEmail', {
  recipients: ['expenses.cloudpro-digital.co.nz'],
  actions: [
    new sesActions.S3({
      bucket: inboundEmailBucket,
      objectKeyPrefix: 'inbound-emails/',
    }),
    new sesActions.Lambda({
      function: processEmailLambda,
      invocationType: sesActions.LambdaInvocationType.EVENT,
    }),
  ],
});

export { backend };
