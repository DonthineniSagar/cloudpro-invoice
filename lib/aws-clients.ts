import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const isLocalStack = process.env.USE_LOCALSTACK === 'true';

const localStackConfig = {
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

export const getDynamoDBClient = () => {
  return new DynamoDBClient(isLocalStack ? localStackConfig : {});
};

export const getS3Client = () => {
  return new S3Client(isLocalStack ? localStackConfig : {});
};

export const getCognitoClient = () => {
  return new CognitoIdentityProviderClient(isLocalStack ? localStackConfig : {});
};
