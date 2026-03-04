import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { transcribeFunction } from './functions/transcribe/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';


const backend =defineBackend({
  auth,
  data,
  storage,
  transcribeFunction,
});

//Grant transcribeFunction access to amazon transcribe 
backend.transcribeFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'transcribe:StartTranscriptionJob',
      'transcribe:GetTranscriptionJob',
    ],
    resources: ['*'],
  })
);

//Grant transcribeFunction access to s3
const bucket = backend.storage.resources.bucket;
bucket.grantReadWrite(backend.transcribeFunction.resources.lambda);

//pass Bucket name to the function 
backend.transcribeFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  bucket.bucketName
);
