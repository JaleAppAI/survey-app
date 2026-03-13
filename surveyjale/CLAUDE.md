# SurveyJale — CLAUDE.md

**REQUIRED: Read `ai/workflow.md` with the Read tool at the start of every session before taking any action, including asking clarifying questions. The workflow file defines which skills to invoke and when — skills must be invoked via the Skill tool, not recalled from memory.**

---

## What This Is

A React survey app with real-time voice transcription. Users answer questions by typing or speaking — voice input streams through Amazon Transcribe via a browser WebSocket so words appear live as they talk. Surveys are data-driven: questions and branching logic live in DynamoDB, not in code.

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React 19 (Vite) | Hosted on AWS Amplify Hosting |
| Backend | AWS Amplify Gen 2 | Code-first TypeScript, CDK under the hood |
| API | AWS AppSync (GraphQL) | Auto-generated from Amplify Data schema |
| Database | Amazon DynamoDB | Provisioned via Amplify Data models: Survey, Question, Submission |
| Transcription | Amazon Transcribe Streaming | Real-time WebSocket streaming from browser to Transcribe. No S3 upload required. |
| Auth | Amazon Cognito | Guest access enabled; unauthenticated IAM role granted Transcribe permissions directly in `backend.ts` |
| Deployment | AWS Amplify Hosting | Git-based CI/CD, auto-deploys frontend + backend on push |

---

## Architecture

### Security Model
- **No API keys in the codebase.** All AWS service access is handled through IAM roles automatically provisioned by Amplify.
- The frontend communicates with the backend through the AppSync GraphQL API (for data operations) and directly with Amazon Transcribe Streaming (for voice transcription).
- DynamoDB authorization rules are defined per-model in the Amplify Data schema. Guest users can read surveys and questions, and create submissions. Admin access requires authentication.
- Transcribe access is granted directly to the Cognito unauthenticated identity role in `backend.ts` using CDK `PolicyStatement`. No Lambda or STS AssumeRole needed. The frontend retrieves credentials via `fetchAuthSession()`.

### Speech Transcription Flow (Real-Time Streaming)
1. User taps "Record" in the browser.
2. The frontend calls `fetchAuthSession()` to get temporary IAM credentials from the Cognito Identity Pool (the unauthenticated role is granted Transcribe permission directly in `backend.ts`).
3. The frontend uses `@aws-sdk/client-transcribe-streaming` to open a WebSocket connection directly from the browser to Amazon Transcribe Streaming.
4. The browser captures microphone audio via `getUserMedia`, PCM-encodes it using the Web Audio API, and streams chunks over the WebSocket in real time.
5. Transcribe returns partial results as the user speaks — words appear on screen progressively.
6. Partial results (may change) are displayed in italic. Final results (confirmed) are appended to the stable transcript.
7. The user sees their transcript live. If it's wrong, they tap "Re-record" immediately. If correct, they confirm.
8. On confirmation, the final transcript text is saved to the response field — no audio files are stored.
- Amazon Transcribe Streaming is used instead of the Web Speech API because browser speech recognition is not supported on iPhone (iOS Safari).
- **No S3 bucket is needed for transcription.** Audio streams directly from the browser to Transcribe and is never stored.

### Why Streaming Instead of Batch
- **Batch (old approach):** Record full audio → upload to S3 → start Transcribe job → poll for completion → return transcript → delete S3 files. User only sees transcript after finishing recording.
- **Streaming (current approach):** Audio streams to Transcribe as the user speaks → transcript appears in real time → user can re-record immediately if wrong. No S3, no polling, no wait.

### Data Flow
1. Questions and conditional logic are fetched from DynamoDB on load via the AppSync GraphQL API (`client.models.Question.list()`).
1a. `UserInfoStep` collects respondent name, email, and industry before questions are shown.
2. User fills in responses (typed or transcribed via real-time voice).
3. On submission, all responses are stored as a JSON array inside a single `Submission` record via the AppSync API (`client.models.Submission.create()`).
4. Admin view fetches all submissions, protected behind Cognito authentication.

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
│   │   └── resource.ts              # Data models: Survey, Question, Submission
│   ├── backend.ts                    # Wires all resources, grants Transcribe IAM permissions to unauthenticated role
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── main.jsx                          # Entry point, Amplify.configure()
│   ├── App.jsx                           # Root: routing (SurveyApp + AdminPage)
│   ├── App.css
│   ├── hooks/
│   │   └── useRealtimeTranscription.js   # Mic capture, Transcribe WebSocket, voice command detection
│   ├── pages/
│   │   └── AdminPage.jsx / .css          # Admin dashboard (Cognito auth gate, submissions table, CSV export)
│   └── Components/
│       ├── FormHeader.jsx / .css          # Survey header
│       ├── Question.jsx / .css            # Single question (text + voice)
│       ├── UserInfoStep.jsx / .css        # Pre-survey info form (name, email, industry)
│       ├── SuccessStep.jsx / .css         # Post-submission success screen
│       └── VoiceRecorder.jsx / .css       # Recording UI with live transcript
├── ai/
│   └── workflow.md                        # ← Claude Code operating rules
├── seedquestions.js                       # Creates Survey + seeds questions, prints share link
├── amplify_outputs.json                   # Auto-generated — do not edit
├── CLAUDE.md                              # ← You are here
├── vite.config.js
└── package.json
```

---

## Routes

- `/?survey=<id>` — Survey respondent flow (guest access)
- `/admin` — Admin dashboard (requires Cognito authentication)
- `/admin?survey=<id>` — Admin dashboard, pre-selects a survey

---

## Amplify Backend Resources

### Data Models (`amplify/data/resource.ts`)

**Survey**
- `id` (auto-generated string)
- `name` (string, required) — the survey name
- `questions` (hasMany Question)
- `submissions` (hasMany Submission)

**Question**
- `id` (auto-generated string)
- `text` (string, required) — the question displayed to the user
- `order` (integer, required) — display order
- `conditions` (JSON, optional) — branching logic
- `surveyId` (id, required) — foreign key

**Submission**
- `id` (auto-generated string)
- `respondentName` (string, required)
- `respondentEmail` (string, required)
- `respondentIndustry` (string, required)
- `responses` (JSON, required) — all answers as a JSON array
- `surveyId` (id, required) — foreign key

### Authorization Rules
- **Survey**: guests can read; authenticated users can read, create, update
- **Question**: guests can read; authenticated users can read, create, update
- **Submission**: guests can create; authenticated users can create and read
- Default authorization mode: `identityPool` (supports unauthenticated/guest access)

---

## Real-Time Transcription Implementation

### Frontend Dependencies
```bash
npm install @aws-sdk/client-transcribe-streaming
```

### Custom Hook (`src/hooks/useRealtimeTranscription.js`)
Manages three concerns:
1. **Microphone access** — captures audio via `getUserMedia` using the Web Audio API, converts raw Float32 to 16-bit PCM at 16kHz
2. **Transcribe WebSocket** — instantiates `TranscribeStreamingClient`, sends audio as async generator, receives results
3. **State management** — tracks `partialTranscript` (in-progress, may change), `finalTranscript` (confirmed), `isRecording`, and `error`

Key configuration in `StartStreamTranscriptionCommand`:
- `IdentifyLanguage`: true
- `LanguageOptions`: "en-US,es-US"
- `MediaEncoding`: "pcm"
- `MediaSampleRateHertz`: 16000
- `EnablePartialResultsStabilization`: true
- `PartialResultsStability`: "medium"

Additional behaviours:
- **Voice command detection** — hook watches for "next question" phrase in the transcript and fires `onVoiceCommand('NEXT_QUESTION', text)` callback
- **Max recording duration** — auto-stops after 120 seconds (`maxDurationMs` option, default 120000)
- Hook return values include `resetTranscript` to clear state between questions

### VoiceRecorder Component (`src/Components/VoiceRecorder.jsx`)
Four UI states:
1. **Idle** — microphone button, "Tap to record"
2. **Recording** — recording indicator + live transcript appearing word by word (partials in italic, finals in normal weight)
3. **Review** — full transcript displayed with "Confirm" and "Re-record" buttons
4. **Confirmed** — locked transcript, value passed to parent via callback

### IAM Requirements
The Cognito unauthenticated identity role is granted Transcribe permissions directly in `backend.ts` using CDK `PolicyStatement`. No Lambda or STS AssumeRole needed.

```typescript
// From backend.ts
const unauthRole = backend.auth.resources.unauthenticatedUserIamRole;
unauthRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'transcribe:StartStreamTranscription',
      'transcribe:StartStreamTranscriptionWebSocket',
    ],
    resources: ['*'],
  })
);
```

---

## Styling

- **Palette:** white, grey, blue (`#2563eb` primary).
- Components use co-located `.css` files except `AdminPage.jsx` which uses inline style objects.
- Cards: white bg, grey border (`#dde3ed`), blue accent.
- Buttons: no box shadows. Hover = color change only.
- Page background: `#f1f4f9`.
- Voice states: green (`#4CAF50`) recording, red (`#f44336`) stop, blue (`#2563eb`) confirm.
- Partial transcript: italic, `#888`. Final transcript: normal weight, full color.
- Recording indicator: pulsing red dot animation.

---

## Key Constraints & Decisions

- **Do not use the Web Speech API** — it fails silently on iOS. All transcription goes through Amazon Transcribe Streaming via a direct WebSocket from the browser.
- Credentials for Transcribe are obtained via `fetchAuthSession()` — the Cognito unauthenticated role has `transcribe:StartStreamTranscription` and `transcribe:StartStreamTranscriptionWebSocket` permissions granted in `backend.ts`.
- All other data access goes through the Amplify Data client (`generateClient()`).
- **Do not hardcode questions** in React components. Questions are fetched from DynamoDB.
- **Do not store API keys or secrets in code.** AWS access is managed entirely through IAM roles provisioned by Amplify.
- **No S3 bucket is needed for transcription.** Audio streams directly from the browser to Transcribe. Do not upload audio files to S3.
- **Audio configuration must match.** The sample rate in `getUserMedia` (16000) must match `MediaSampleRateHertz` in `StartStreamTranscriptionCommand` (16000). Mismatches cause garbled audio.
- **HTTPS required for microphone access.** `getUserMedia` requires a secure context. Localhost is exempt during development.
- The app must work on mobile, including iPhone Safari.
- **Amplify Gen 2 only** — do not use Gen 1 CLI commands (`amplify add`, `amplify push`). All backend resources are defined as TypeScript in the `amplify/` directory.
- The `amplify_outputs.json` file is auto-generated. Do not edit it manually. It is regenerated each time `npx ampx sandbox` runs or a deployment completes.

---

## Environment Variables & Secrets

No API keys are needed in the codebase or environment. AWS credentials are handled through IAM roles:

- **Frontend** connects to backend services via `amplify_outputs.json` (auto-generated)
- **Transcribe access** is granted to the Cognito unauthenticated identity role in `backend.ts` — credentials retrieved at runtime via `fetchAuthSession()`, never hardcoded
- **Local development** requires AWS credentials configured via `aws configure` (profile with PowerUserAccess or AdministratorAccess-Amplify)

If any third-party secrets are needed in the future, use Amplify's `secret()` function in resource definitions, and set values via:
```bash
npx ampx sandbox secret set SECRET_NAME
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| Mic permission denied | Site must be HTTPS (localhost exempt in dev) |
| WebSocket fails | Check `backend.ts` IAM policy on the unauthenticated role; verify `fetchAuthSession()` returns valid credentials; confirm region supports Transcribe Streaming |
| Bad transcription | Add Custom Vocabulary in Transcribe with domain terms |
| Audio gaps / cutouts | PCM sample rate must match `MediaSampleRateHertz` (both 16000) |
| High latency on mobile | Reduce audio chunk size for more frequent partials |
| iPhone mic not working | Needs HTTPS + user gesture to start audio capture in Safari |

---

## Development

```bash
# Terminal 1 — cloud sandbox (deploys real AWS resources for dev)
npx ampx sandbox

# Terminal 2 — frontend
npm run dev

# Seed a new survey (prints share link)
node seedquestions.js --name "Survey Name"

# For production links
node seedquestions.js --name "Survey Name" --url https://your-app.amplifyapp.com

# Tear down sandbox
npx ampx sandbox delete

# Production build
npm run build
```

### Local Dev Flow
1. `npx ampx sandbox` → deploys dev backend, generates `amplify_outputs.json`.
2. `npm run dev` → Vite at `http://localhost:5173`.
3. `node seedquestions.js --name "Test"` → prints link like `http://localhost:5173?survey=<id>`.
4. Open link to test end-to-end.
5. Backend edits in `amplify/` → sandbox auto-redeploys. Frontend edits → Vite hot-reloads.

### Deployment
Push to `main`. Amplify Hosting auto-builds and deploys frontend + backend.
