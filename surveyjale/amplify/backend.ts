import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  storage,
});

// Grant Cognito unauthenticated role (survey respondents) Transcribe + Polly fallback
const unauthRole = backend.auth.resources.unauthenticatedUserIamRole;
unauthRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'transcribe:StartStreamTranscription',
      'transcribe:StartStreamTranscriptionWebSocket',
      'polly:SynthesizeSpeech',
    ],
    resources: ['*'],
  })
);

// Grant Cognito authenticated role permission to use Polly (for admin audio generation)
const authRole = backend.auth.resources.authenticatedUserIamRole;
authRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'polly:SynthesizeSpeech',
      'transcribe:StartStreamTranscription',
      'transcribe:StartStreamTranscriptionWebSocket',
    ],
    resources: ['*'],
  })
);
