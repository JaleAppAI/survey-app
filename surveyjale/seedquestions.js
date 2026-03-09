import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Hash } from '@smithy/hash-node';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { fromNodeProviderChain } = require('@aws-sdk/credential-providers/dist-cjs/index.js');

const APPSYNC_URL = 'https://ozp5cb2etvcg3osfr4xwbfth7y.appsync-api.us-east-2.amazonaws.com/graphql';
const REGION = 'us-east-2';

const questions = [
    // Phase 1: Context & Workflow
    { text: "Walk me through what happens when you need to fill an hourly position — from the moment you realize you need someone to their first day on the job.", order: 1 },
    { text: "How many people are involved in your hiring decisions, and who makes the final call?", order: 2 },

    // Phase 2: Pain Discovery & Quantification
    { text: "Tell me about the last time a hire didn't work out. What happened? (Follow up: How often does that happen?)", order: 3 },
    { text: "How many applicants do you typically review to find one person you'd actually hire? (Follow up: Where do those applicants come from?)", order: 4 },
    { text: "What's your biggest frustration with the tool or platform you already use? (Follow up: What made you start using it in the first place?)", order: 5 },
    { text: "When you're evaluating an hourly candidate, what tells you this person will actually show up and do good work?", order: 6 },
    { text: "What does it cost you — in dollars, time, or headaches — when a position goes unfilled for a week? (Follow up: How about when someone no-shows on day one?)", order: 7 },

    // Phase 3: Solution Exploration
    { text: "If you could change one thing about how you find and hire hourly workers, what would it be?", order: 8 },
    { text: "How do you currently verify that someone can actually do the job before you hire them?", order: 9 },
    { text: "Have you ever tried a staffing agency, Instawork, or a different platform? What happened?", order: 10 },

    // Phase 4: Commitment & Validation
    { text: "What's your current monthly spend on hiring — including job boards, agency fees, and the time you and your team put into it? (Follow up: Is that going up or down?)", order: 11 },
    { text: "Is there anything I should have asked about that I didn't?", order: 12 },
];

// Parse CLI args
const args = process.argv.slice(2);
const nameIdx = args.indexOf('--name');
const surveyName = nameIdx !== -1 && args[nameIdx + 1]
    ? args[nameIdx + 1]
    : `Survey ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
const urlIdx = args.indexOf('--url');
const APP_URL = urlIdx !== -1 && args[urlIdx + 1]
    ? args[urlIdx + 1].replace(/\/$/, '')
    : 'http://localhost:5173';

const CREATE_SURVEY = `
  mutation CreateSurvey($input: CreateSurveyInput!) {
    createSurvey(input: $input) {
      id
      name
    }
  }
`;

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
    // Step 1: Create survey
    const surveyResult = await signedFetch(CREATE_SURVEY, { input: { name: surveyName } });
    if (surveyResult.errors) {
        console.error('Failed to create survey:', surveyResult.errors);
        process.exit(1);
    }
    const survey = surveyResult.data.createSurvey;
    console.log(`Survey created: "${survey.name}" (id: ${survey.id})`);

    // Step 2: Seed questions with surveyId
    for (const q of questions) {
        const result = await signedFetch(CREATE_QUESTION, { input: { ...q, surveyId: survey.id } });
        if (result.errors) {
            console.error(`Failed to create "${q.text}":`, result.errors);
        } else {
            console.log(`Created: "${result.data.createQuestion.text}"`);
        }
    }

    console.log(`\nSeeded ${questions.length} questions.`);
    console.log(`Share link: ${APP_URL}?survey=${survey.id}`);
}

seed();
