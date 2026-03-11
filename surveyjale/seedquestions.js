import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Hash } from '@smithy/hash-node';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { fromNodeProviderChain } = require('@aws-sdk/credential-providers/dist-cjs/index.js');

const APPSYNC_URL = 'https://uol5s75hmzfc3mnovu7aj2ozt4.appsync-api.us-east-2.amazonaws.com/graphql';
const REGION = 'us-east-2';

const questions = [
    { text: "How satisfied are you with our service overall?", order: 1 },
    { text: "What did we do well during your experience with us?", order: 2 },
    { text: "What could we have done better?", order: 3 },
    { text: "How likely are you to recommend us to a friend or colleague?", order: 4 },
    { text: "Is there anything else you would like to share with us?", order: 5 },
];

const CREATE_QUESTION = `
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      text
      order
    }
  }
`;

async function signedFetch(query, variables) {
    const url = new URL(APPSYNC_URL);
    const body = JSON.stringify({ query, variables });

    const request = new HttpRequest({
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        headers: {
            'Content-Type': 'application/json',
            host: url.hostname,
        },
        body,
    });

    const signer = new SignatureV4({
        credentials: fromNodeProviderChain(),
        region: REGION,
        service: 'appsync',
        sha256: Hash.bind(null, 'sha256'),
    });

    const signed = await signer.sign(request);

    const res = await fetch(APPSYNC_URL, {
        method: signed.method,
        headers: signed.headers,
        body: signed.body,
    });

    return res.json();
}

async function seed() {
    for (const q of questions) {
        const result = await signedFetch(CREATE_QUESTION, { input: q });
        if (result.errors) {
            console.error(`Failed to create "${q.text}":`, result.errors);
        } else {
            console.log(`Created: "${result.data.createQuestion.text}"`);
        }
    }
}

seed();