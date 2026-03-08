# SurveyJale — CLAUDE.md

Project context and architectural guidelines for Claude Code sessions.

---

## Project Overview

A React-based survey application that supports both typed and voice responses. Voice input is transcribed in real time via Amazon Transcribe Streaming over WebSockets — users see their words appear on screen as they speak, and can immediately re-record if the transcription is wrong. The app is designed to be reusable across different survey campaigns — questions and conditional logic live in the database, not in the code. Admins can update question sets without touching the codebase.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (Vite) | Hosted on AWS Amplify Hosting |
| Backend Framework | AWS Amplify Gen 2 | Code-first TypeScript backend using CDK |
| API | AWS AppSync (GraphQL) | Auto-generated from Amplify Data schema |
| Database | Amazon DynamoDB | Provisioned via Amplify Data models |
| Serverless Functions | AWS Lambda | Defined with `defineFunction`, used for generating transcription credentials |
| Transcription | Amazon Transcribe Streaming | Real-time WebSocket streaming from browser to Transcribe. No S3 upload required. |
| Auth | Amazon Cognito | Guest access enabled for anonymous survey submissions |
| Deployment | AWS Amplify Hosting | Git-based CI/CD, auto-deploys frontend + backend on push |

---

## Architecture

### Security Model
- **No API keys in the codebase.** All AWS service access is handled through IAM roles automatically provisioned by Amplify.
- The frontend communicates with the backend exclusively through the AppSync GraphQL API (for data operations) and a credential-generating Lambda (for transcription).
- Lambda functions receive only the IAM permissions explicitly granted in `backend.ts` — least-privilege by default.
- DynamoDB authorization rules are defined per-model in the Amplify Data schema. Guest users can read questions and create responses. Admin access requires authentication.
- Transcription credentials are short-lived (15 min) and scoped to `transcribe:StartStreamTranscription` only.

### Speech Transcription Flow (Real-Time Streaming)
1. User taps "Record" in the browser.
2. The frontend calls a Lambda function (via a custom GraphQL mutation) to get temporary AWS credentials scoped to `transcribe:StartStreamTranscription`.
3. The frontend uses `@aws-sdk/client-transcribe-streaming` to open a WebSocket connection directly from the browser to Amazon Transcribe Streaming.
4. The browser captures microphone audio via `getUserMedia`, PCM-encodes it, and streams chunks over the WebSocket in real time.
5. Transcribe returns partial results as the user speaks — words appear on screen progressively.
6. Partial results (may change) are displayed in italic. Final results (confirmed) are appended to the stable transcript.
7. The user sees their transcript live. If it's wrong, they tap "Re-record" immediately. If correct, they confirm.
8. On confirmation, the final transcript text is saved to the response field — no audio files are stored.
- Amazon Transcribe Streaming is used instead of the Web Speech API because browser speech recognition is not supported on iPhone (iOS Safari).
- **No S3 bucket is needed for transcription.** Audio streams directly from the browser to Transcribe and is never stored.

### Why Streaming Instead of Batch
- **Batch (old approach):** Record full audio → upload to S3 → start Transcribe job → poll for completion → return transcript → delete S3 files. User only sees transcript after finishing recording.
- **Streaming (current approach):** Audio streams to Transcribe as the user speaks → transcript appears in real time → user can re-record immediately if wrong. No S3, no polling, no wait.
- Lambda cannot hold a long-running WebSocket open (it's stateless and short-lived), so the WebSocket runs in the browser. Lambda only generates credentials (~200ms invocation).

### Data Flow
1. Questions and conditional logic are fetched from DynamoDB on load via the AppSync GraphQL API (`client.models.Question.list()`).
2. User fills in responses (typed or transcribed via real-time voice).
3. On submission, each response is created in DynamoDB via the AppSync API (`client.models.Response.create()`).
4. Admin view fetches all responses, protected behind Cognito authentication.

### Question & Conditional Logic Schema
Questions are stored in DynamoDB with fields that control branching behaviour — e.g. a response to Q1 may skip or show Q3. This keeps the frontend logic generic and data-driven. Never hardcode question text or flow in the React components.

---

## Project Structure

```
surveyjale/
├── amplify/
│   ├── auth/
│   │   └── resource.ts              # Cognito auth config (guest access enabled)
│   ├── data/
│   │   └── resource.ts              # Data models (Question, Response) + getTranscribeCredentials mutation
│   ├── functions/
│   │   └── transcribe-credentials/
│   │       ├── resource.ts           # Lambda function definition
│   │       └── handler.ts            # Returns temporary STS credentials for Transcribe Streaming
│   ├── backend.ts                    # Wires all resources, grants IAM permissions
│   ├── package.json
│   └── tsconfig.json
├── public/
├── src/
│   ├── main.jsx             # React entry point, calls Amplify.configure()
│   ├── App.jsx              # Root component, fetches questions, handles submission
│   ├── App.css              # Global app styles (background, layout)
│   ├── hooks/
│   │   └── useRealtimeTranscription.js  # Custom hook: mic capture, Transcribe WebSocket, state
│   └── Components/
│       ├── FormHeader.jsx    # Survey header with instructions
│       ├── FormHeader.css
│       ├── Question.jsx      # Renders a single survey question (text + voice)
│       ├── Question.css
│       ├── VoiceRecorder.jsx # Recording component with live transcript + re-record UX
│       └── VoiceRecorder.css
├── scripts/
│   └── seed-questions.js     # Seeds question data into DynamoDB
├── amplify_outputs.json      # Auto-generated by sandbox/deploy — connects frontend to backend
├── CLAUDE.md
├── vite.config.js
└── package.json
```

---

## Amplify Backend Resources

### Data Models (`amplify/data/resource.ts`)

**Question**
- `id` (auto-generated string)
- `text` (string, required) — the question displayed to the user
- `order` (integer, required) — display order
- `conditions` (JSON, optional) — branching logic

**Response**
- `id` (auto-generated string)
- `questionId` (string, required) — references a Question
- `responseText` (string, required) — the user's answer

**Custom Mutations**
- `getTranscribeCredentials(): String` — returns temporary AWS credentials (accessKeyId, secretAccessKey, sessionToken) scoped to `transcribe:StartStreamTranscription`. Backed by the transcribe-credentials Lambda function.

### Authorization Rules
- **Question**: guests and authenticated users can read
- **Response**: guests and authenticated users can create and read
- **getTranscribeCredentials**: guests can invoke
- Default authorization mode: IAM (supports unauthenticated/guest access)

### Lambda Functions (`amplify/functions/`)
- **transcribe-credentials** — uses STS AssumeRole to generate short-lived credentials (15 min) with only `transcribe:StartStreamTranscription` permission. Returns credentials as JSON. Has IAM permissions for `sts:AssumeRole` and the target role must trust the Lambda execution role. Timeout: 10s, Memory: 128MB.

---

## Real-Time Transcription Implementation

### Frontend Dependencies
```bash
npm install @aws-sdk/client-transcribe-streaming microphone-stream
```

### Custom Hook (`src/hooks/useRealtimeTranscription.js`)
Manages three concerns:
1. **Microphone access** — captures audio via `getUserMedia`, converts raw Float32 to 16-bit PCM at 16kHz
2. **Transcribe WebSocket** — instantiates `TranscribeStreamingClient`, sends audio as async generator, receives results
3. **State management** — tracks `partialTranscript` (in-progress, may change), `finalTranscript` (confirmed), `isRecording`, and `error`

Key configuration in `StartStreamTranscriptionCommand`:
- `LanguageCode`: "en-US"
- `MediaEncoding`: "pcm"
- `MediaSampleRateHertz`: 16000
- `EnablePartialResultsStabilization`: true
- `PartialResultsStability`: "medium"

### VoiceRecorder Component (`src/Components/VoiceRecorder.jsx`)
Four UI states:
1. **Idle** — microphone button, "Tap to record"
2. **Recording** — recording indicator + live transcript appearing word by word (partials in italic, finals in normal weight)
3. **Review** — full transcript displayed with "Confirm" and "Re-record" buttons
4. **Confirmed** — locked transcript, value passed to parent via callback

### Lambda Credential Endpoint (`amplify/functions/transcribe-credentials/handler.ts`)
```typescript
// Pseudocode — uses STS to generate scoped temporary credentials
const sts = new STSClient({ region });
const { Credentials } = await sts.send(new AssumeRoleCommand({
  RoleArn: TRANSCRIBE_ROLE_ARN,
  RoleSessionName: "survey-transcription",
  DurationSeconds: 900,
  Policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: "transcribe:StartStreamTranscription",
      Resource: "*"
    }]
  })
}));
// Return { accessKeyId, secretAccessKey, sessionToken }
```

### IAM Requirements
The Lambda execution role needs `sts:AssumeRole` permission. The assumed role needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "transcribe:StartStreamTranscription",
    "Resource": "*"
  }]
}
```
Grant this in `backend.ts` when wiring the Lambda function.

---

## Styling Guidelines

- **Brand colors:** White, grey, and blue (primary).
- **No inline styles** — all styles live in co-located `.css` files next to their component.
- Component cards use white backgrounds, grey borders (`#dde3ed`), and blue (`#2563eb`) as the accent.
- No box shadows on buttons. Hover state = color change only.
- Page background: light grey (`#f1f4f9`).
- Voice recorder: green accent (`#4CAF50`) for recording state, red (`#f44336`) for stop button, blue (`#2563eb`) for confirm.
- Partial transcript text: italic, lighter color (`#888`). Final transcript text: normal weight, full color.
- Recording indicator: pulsing red dot animation.

---

## Key Constraints & Decisions

- **Do not use the Web Speech API** — it fails silently on iOS. All transcription goes through Amazon Transcribe Streaming via a direct WebSocket from the browser.
- **Do not call AWS services directly from the frontend** except for Amazon Transcribe Streaming, which requires a direct browser-to-AWS WebSocket for real-time performance. Credentials for this connection are obtained through a Lambda function via the GraphQL API.
- All other data access goes through the Amplify Data client (`generateClient()`).
- **Do not hardcode questions** in React components. Questions are fetched from DynamoDB.
- **Do not store API keys or secrets in code.** AWS access is managed entirely through IAM roles provisioned by Amplify. Transcribe credentials are temporary and scoped.
- **No S3 bucket is needed for transcription.** Audio streams directly from the browser to Transcribe. Do not upload audio files to S3.
- **Audio configuration must match.** The sample rate in `getUserMedia` (16000) must match `MediaSampleRateHertz` in `StartStreamTranscriptionCommand` (16000). Mismatches cause garbled audio.
- **HTTPS required for microphone access.** `getUserMedia` requires a secure context. Localhost is exempt during development.
- Keep Lambda functions focused — the transcribe-credentials Lambda validates input, calls STS, and returns credentials. No business logic.
- The app must work on mobile, including iPhone Safari.
- **Amplify Gen 2 only** — do not use Gen 1 CLI commands (`amplify add`, `amplify push`). All backend resources are defined as TypeScript in the `amplify/` directory.
- The `amplify_outputs.json` file is auto-generated. Do not edit it manually. It is regenerated each time `npx ampx sandbox` runs or a deployment completes.

---

## Environment Variables & Secrets

No API keys are needed in the codebase or environment. AWS credentials are handled through IAM roles:

- **Lambda functions** receive permissions via IAM policies defined in `backend.ts`
- **Frontend** connects to backend services via `amplify_outputs.json` (auto-generated)
- **Transcribe credentials** are generated at runtime by the Lambda function using STS AssumeRole — never hardcoded
- **Local development** requires AWS credentials configured via `aws configure` (profile with PowerUserAccess or AdministratorAccess-Amplify)

If any third-party secrets are needed in the future, use Amplify's `secret()` function in resource definitions, and set values via:
```bash
npx ampx sandbox secret set SECRET_NAME
```

---

## Troubleshooting

- **Microphone permission denied:** Ensure the site is served over HTTPS. Localhost is exempt in dev.
- **WebSocket connection fails:** Verify the credentials returned by the Lambda have `transcribe:StartStreamTranscription` permission. Check the AWS region supports Transcribe Streaming.
- **Inaccurate transcription:** Add a Custom Vocabulary in Amazon Transcribe with domain-specific terms from the survey.
- **Audio cuts out or gaps:** Ensure PCM encoding sample rate matches `MediaSampleRateHertz` (both 16000).
- **High latency on mobile:** Reduce audio chunk size for more frequent partial results.
- **Transcription not working on iPhone:** Confirm `getUserMedia` is called in a secure context (HTTPS) and that the microphone permission prompt is shown. Safari requires user gesture to start audio capture.

---

## Development

```bash
# Start the cloud sandbox (deploys real AWS resources for dev)
# Run this in a separate terminal — it watches for backend changes
npx ampx sandbox

# Run the frontend locally
npm run dev

# Seed questions into DynamoDB
node scripts/seed-questions.js

# Delete sandbox resources when done
npx ampx sandbox delete

# Run tests
npm test

# Production build
npm run build
```

### Local Development Flow
1. Run `npx ampx sandbox` — this deploys a personal dev backend to AWS and generates `amplify_outputs.json`
2. Run `npm run dev` in a second terminal — Vite serves the frontend at `http://localhost:5173`
3. Edit backend files in `amplify/` — the sandbox auto-redeploys changes
4. Edit frontend files in `src/` — Vite hot-reloads changes

### Deployment
Push to `main` on GitHub. Amplify Hosting auto-builds and deploys both frontend and backend. No manual steps needed.