# SurveyJale — CLAUDE.md

**REQUIRED: Read `ai/workflow.md` with the Read tool at the start of every session before taking any action, including asking clarifying questions. The workflow file defines which skills to invoke and when — skills must be invoked via the Skill tool, not recalled from memory.**

---

## What This Is

A React survey app with real-time voice transcription and text-to-speech. Users answer questions by typing or speaking — voice input streams through Amazon Transcribe via a browser WebSocket so words appear live as they talk. Questions can be read aloud via Amazon Polly with a 3-tier audio caching strategy. Surveys are data-driven: questions and branching logic live in DynamoDB, not in code.

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React 19 (Vite 7) | Hosted on AWS Amplify Hosting |
| Backend | AWS Amplify Gen 2 | Code-first TypeScript, CDK under the hood |
| API | AWS AppSync (GraphQL) | Auto-generated from Amplify Data schema |
| Database | Amazon DynamoDB | Provisioned via Amplify Data models: Survey, Question, Submission |
| Transcription | Amazon Transcribe Streaming | Real-time WebSocket streaming from browser to Transcribe. No S3 upload for audio. |
| Text-to-Speech | Amazon Polly (Neural engine) | Pre-generated audio stored in S3 + runtime synthesis fallback |
| Storage | Amazon S3 | Pre-recorded question audio at `audio/{surveyId}/{questionId}.mp3` |
| Auth | Amazon Cognito | Guest access enabled; unauthenticated IAM role granted Transcribe + Polly permissions in `backend.ts` |
| Icons | lucide-react | Mic, Square, Check, RotateCcw, Send, Volume2, VolumeX, FileText |
| Font | Syne (Google Fonts) | Primary typeface + system fallbacks |
| Deployment | AWS Amplify Hosting | Git-based CI/CD, auto-deploys frontend + backend on push to `main` |

---

## Architecture

### Security Model
- **No API keys in the codebase.** All AWS service access is handled through IAM roles automatically provisioned by Amplify.
- The frontend communicates with the backend through the AppSync GraphQL API (for data operations) and directly with Amazon Transcribe Streaming (for voice transcription) and Amazon Polly (for TTS).
- DynamoDB authorization rules are defined per-model in the Amplify Data schema. Guest users can read surveys and questions, and create submissions. Admin access requires authentication.
- Transcribe and Polly access is granted directly to both the Cognito unauthenticated and authenticated identity roles in `backend.ts` using CDK `PolicyStatement`. No Lambda or STS AssumeRole needed. The frontend retrieves credentials via `fetchAuthSession()`.
- S3 storage uses path-based access: `audio/*` is readable by guests, writable by authenticated users.

### Speech Transcription Flow (Real-Time Streaming)
1. User taps "Record" in the browser.
2. The frontend calls `fetchAuthSession()` to get temporary IAM credentials from the Cognito Identity Pool.
3. The frontend uses `@aws-sdk/client-transcribe-streaming` to open a WebSocket connection directly from the browser to Amazon Transcribe Streaming.
4. The browser captures microphone audio via `getUserMedia` (with `echoCancellation` and `noiseSuppression` enabled), PCM-encodes it using the Web Audio API (`ScriptProcessorNode` with 4096-sample buffer), and streams chunks over the WebSocket in real time.
5. Transcribe returns partial results as the user speaks — words appear on screen progressively.
6. Partial results (may change) are displayed in italic. Final results (confirmed) are appended to the stable transcript.
7. The user sees their transcript live. If it's wrong, they tap "Re-record" immediately. If correct, they confirm.
8. On confirmation, the final transcript text is saved to the response field — no audio files are stored.
9. **Voice command detection**: if the user says "next question", the hook detects it in the transcript (normalized: lowercase, punctuation removed, whitespace collapsed), removes the phrase, auto-confirms the remaining text, and fires a callback that focuses the next question and auto-starts recording.
10. **Auto-stop**: recording stops automatically after `maxDurationMs` (default 30s in VoiceRecorder). On timer expiry the transcript is auto-confirmed, and unless it's the last question, auto-advances to the next.

### Text-to-Speech Flow (Amazon Polly)
1. Admin creates a survey via CSV upload in the admin dashboard.
2. For each question, the admin page calls Polly `SynthesizeSpeechCommand` (neural engine, MP3, voice "Ruth") and uploads the audio to S3 at `audio/{surveyId}/{questionId}.mp3`.
3. The `Question.audioKey` field in DynamoDB stores the S3 path.
4. When a respondent clicks the play button on a question, `useTextToSpeech` attempts three paths in order:
   - **Path 1 — In-memory cache**: If the audioKey's blob URL is already in the `blobCacheRef` Map, play immediately.
   - **Path 2 — S3 fetch**: Call `getUrl({ path: audioKey })` to get a signed URL, fetch the blob, cache it in memory, play.
   - **Path 3 — Runtime Polly**: If no audioKey or S3 fails, synthesize on-the-fly via Polly client (credentials from Cognito), play the resulting blob.
5. The hook prevents overlapping playback via a `speakIdRef` counter that invalidates stale requests.
6. An 80ms delay on `speak()` prevents blur events from cancelling audio.

### Why Streaming Instead of Batch
- **Batch (old approach):** Record full audio → upload to S3 → start Transcribe job → poll for completion → return transcript → delete S3 files. User only sees transcript after finishing recording.
- **Streaming (current approach):** Audio streams to Transcribe as the user speaks → transcript appears in real time → user can re-record immediately if wrong. No S3, no polling, no wait.

### Data Flow
1. Questions and conditional logic are fetched from DynamoDB on load via the AppSync GraphQL API (`client.models.Question.list()`).
1a. `UserInfoStep` collects respondent name, email, and industry before questions are shown.
2. User fills in responses (typed or transcribed via real-time voice). Responses auto-save to `localStorage` keyed by `survey_autosave_{surveyId}`.
3. On submission:
   - All responses are validated (must be non-empty).
   - Duplicate check: queries existing submissions matching `respondentEmail` + `surveyId`.
   - All responses are stored as a JSON array inside a single `Submission` record via the AppSync API (`client.models.Submission.create()`).
   - `localStorage` autosave is cleared.
4. Admin view fetches all submissions, protected behind Cognito authentication.

### Question & Conditional Logic Schema
Questions are stored in DynamoDB with fields that control branching behaviour — e.g. a response to Q1 may skip or show Q3. The `conditions` field is a JSON object. This keeps the frontend logic generic and data-driven. Never hardcode question text or flow in the React components.

---

## Project Structure

```
surveyjale/
├── amplify/
│   ├── auth/
│   │   └── resource.ts              # Cognito auth config (email login, guest access)
│   ├── data/
│   │   └── resource.ts              # Data models: Survey, Question, Submission + auth rules
│   ├── storage/
│   │   └── resource.ts              # S3 bucket "surveyAudio" (audio/* path, guest read, auth read/write)
│   ├── backend.ts                    # Wires auth+data+storage, grants Transcribe+Polly IAM to both roles
│   ├── package.json                  # { "type": "module" }
│   └── tsconfig.json                 # ES2022, strict, bundler resolution, $amplify/* path alias
├── src/
│   ├── main.jsx                          # Entry point: Amplify.configure(), StrictMode, BrowserRouter, ErrorBoundary
│   ├── App.jsx                           # Root: routing (lazy AdminPage + SurveyApp) + full survey state machine
│   ├── App.css                           # Submit buttons, fade-up list animation, error box
│   ├── index.css                         # Global: radial gradient bg (#D4DCE6), Syne font, .form-card-shadow
│   ├── hooks/
│   │   ├── useRealtimeTranscription.js   # Mic capture → PCM encode → Transcribe WebSocket → voice command detection
│   │   └── useTextToSpeech.js            # 3-tier TTS: in-memory cache → S3 fetch → runtime Polly synthesis
│   ├── pages/
│   │   ├── AdminPage.jsx                 # Auth gate, survey CRUD, CSV import/export, submission viewer, S3 audio gen
│   │   └── AdminPage.css                 # Responsive: hides email/industry columns on mobile
│   └── Components/
│       ├── ErrorBoundary.jsx             # React class component: catches render errors, shows refresh button
│       ├── FormHeader.jsx / .css         # Static: survey title, instructions, "say next question" tip
│       ├── Question.jsx / .css           # Question card: textarea + play button + VoiceRecorder child
│       ├── UserInfoStep.jsx / .css       # Pre-survey form: name, email (validated on blur), industry
│       ├── SuccessStep.jsx / .css        # Post-submit: checkmark, personalized thank-you, "close tab" note
│       └── VoiceRecorder.jsx / .css      # Recording state machine: idle → recording → review → confirmed
├── ai/
│   └── workflow.md                        # ← Claude Code operating rules and skill invocation map
├── seedquestions.js                       # CLI: creates Survey + 12 hardcoded questions via AppSync, prints share link
├── amplify_outputs.json                   # Auto-generated by Amplify — do not edit
├── CLAUDE.md                              # ← You are here
├── vite.config.js                         # React plugin + manual chunks (aws-sdk, aws-amplify split)
└── package.json                           # React 19, Amplify 6, AWS SDK v3, lucide-react, Vite 7
```

---

## Routes

- `/?survey=<id>` — Survey respondent flow (guest access, identity pool auth)
- `/admin` — Admin dashboard (requires Cognito user pool authentication)
- `/admin?survey=<id>` — Admin dashboard, pre-selects a survey

---

## Amplify Backend Resources

### Auth (`amplify/auth/resource.ts`)
- Login method: email + password
- Password policy: 8+ chars, lowercase, uppercase, numbers, symbols required
- MFA: disabled
- Guest (unauthenticated) identities: enabled
- Creates: Cognito User Pool, Identity Pool, unauthenticated role, authenticated role

### Storage (`amplify/storage/resource.ts`)
- Bucket name: `surveyAudio`
- Path: `audio/*`
- Guest access: read only (respondents can download question audio)
- Authenticated access: read + write (admins upload Polly-generated MP3s)

### IAM Policies (`amplify/backend.ts`)

**Unauthenticated Role (Survey Respondents):**
- `transcribe:StartStreamTranscription` — real-time voice transcription
- `transcribe:StartStreamTranscriptionWebSocket` — WebSocket connection
- `polly:SynthesizeSpeech` — TTS fallback (runtime Polly when S3 audio unavailable)

**Authenticated Role (Admin Users):**
- Same Transcribe + Polly permissions as unauthenticated role

```typescript
// From backend.ts
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
```

### Data Models (`amplify/data/resource.ts`)

Default authorization mode: `identityPool` (supports unauthenticated/guest access).

**Survey**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | auto | Primary key |
| `name` | string | yes | Survey title |
| `questions` | hasMany(Question) | — | Via `surveyId` FK |
| `submissions` | hasMany(Submission) | — | Via `surveyId` FK |

Auth: guests → read; authenticated → read, create, update

**Question**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | auto | Primary key |
| `text` | string | yes | Question displayed to respondent |
| `order` | integer | yes | Display order (1, 2, 3...) |
| `conditions` | JSON | no | Branching logic |
| `audioKey` | string | no | S3 path: `audio/{surveyId}/{questionId}.mp3` |
| `surveyId` | id | yes | Foreign key → Survey |

Auth: guests → read; authenticated → read, create, update

**Submission**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | auto | Primary key |
| `respondentName` | string | yes | Name from UserInfoStep |
| `respondentEmail` | string | yes | Email from UserInfoStep |
| `respondentIndustry` | string | yes | Industry from UserInfoStep |
| `responses` | JSON | yes | Stringified array of all answers |
| `surveyId` | id | yes | Foreign key → Survey |

Auth: guests → create only (cannot read other submissions); authenticated → create, read

---

## Component Deep Dive

### `main.jsx`
Entry point. Configures Amplify with `amplify_outputs.json`, wraps app in `StrictMode` → `ErrorBoundary` → `BrowserRouter` → `App`.

### `App.jsx` — Two Components

**`App` (Router)**
- Route `/admin` → lazy-loaded `AdminPage` with Suspense fallback
- Route `/*` → `SurveyApp`

**`SurveyApp` (Survey State Machine)**

State variables:
| State | Type | Purpose |
|-------|------|---------|
| `step` | `'info' \| 'survey' \| 'submitted'` | Current flow stage |
| `respondentName/Email/Industry` | string | From UserInfoStep |
| `questions` | array | Fetched from DynamoDB, sorted by `order` |
| `responses` | string[] | One per question, auto-saved to localStorage |
| `submitting` | boolean | True during submit API call |
| `submitError` | string | Displayed above submit button |
| `errors` | boolean[] | Per-question validation errors |
| `fetchError` | boolean | True if question fetch fails |
| `recordingIndex` | number | Index of question currently auto-recording (voice command) |
| `speakingIndex` | number | Index of question currently playing TTS audio |
| `authMode` | string | `'userPool'` or `'identityPool'` (detected on mount) |
| `questionRefs` | ref[] | Refs to textarea elements for programmatic focus |

Key behaviors:
- **Auth detection**: calls `fetchAuthSession()` on mount to determine auth mode
- **Question fetch**: triggered when `surveyId` or `authMode` changes; filters by `surveyId`, restores autosaved responses if question count matches
- **Autosave**: writes `responses` to `localStorage` on every change (key: `survey_autosave_{surveyId}`)
- **Voice command handler**: "NEXT_QUESTION" → focuses next question's textarea, sets `recordingIndex` to auto-start recording
- **Submit validation**: checks all responses non-empty, queries for duplicate (email + surveyId), creates Submission, clears localStorage
- **TTS integration**: `useTextToSpeech` hook provides `speak(text, audioKey)` and `stopSpeaking()`; parent tracks `speakingIndex` to show active play state per question

### `Question.jsx`
Question card with header (number, text, play button), textarea, and VoiceRecorder child.

Props: `questionNumber`, `questionText`, `value`, `onChange`, `inputRef`, `hasError`, `onVoiceCommand`, `autoStartRecording`, `onRecordingStarted`, `audioKey`, `speak`, `stopSpeaking`, `isSpeaking`, `isLastQuestion`

Key behaviors:
- **Live transcript display**: textarea shows `value + liveFinal + livePartial` (partial in italic via CSS)
- **Textarea read-only** during active recording (prevents typing while speaking)
- **Play button**: toggles TTS; blue when idle, light blue when active
- **Transcript confirmed**: appends new transcript to existing response (space-separated, supports multiple recordings per question)

### `VoiceRecorder.jsx`
Recording state machine with 4 visual states:

| State | UI | Actions |
|-------|-----|---------|
| Idle | "Record" button (blue) | Click → startRecording |
| Recording | Pulsing red dot, "Recording — speak now", countdown timer | Auto-stops on timer; orange warning at ≤5s with blink animation |
| Review | "Confirm" (green) + "Re-record" (gray) buttons | Confirm → lock transcript; Re-record → reset and clear |
| Confirmed | "Re-record" button only | Can re-record to append more |

Props: `region`, `languageOptions`, `getCredentials`, `onTranscriptConfirmed`, `onVoiceCommand`, `onLiveTranscriptChange`, `onTranscriptCleared`, `autoStartRecording`, `onRecordingStarted`, `maxRecordingMs` (default 30s), `isLastQuestion`

### `UserInfoStep.jsx`
Pre-survey form collecting name, email, industry. Email validated via regex on blur. Continue button disabled until all three fields valid.

### `FormHeader.jsx`
Static header: "Feedback Survey" title, instructions about typing/speaking, tip about "Next Question" voice command, required field indicator.

### `SuccessStep.jsx`
Post-submit card: animated checkmark in blue gradient circle, personalized "Thank you, {name}!" message, "close this tab" note.

### `ErrorBoundary.jsx`
React class component. Catches render errors via `getDerivedStateFromError`, logs via `componentDidCatch`, shows "Refresh Page" button.

---

## Custom Hooks

### `useRealtimeTranscription.js`

**Parameters:** `{ region, languageOptions, getCredentials, maxDurationMs, onVoiceCommand, onTimerExpired }`

**Returns:** `{ partialTranscript, finalTranscript, isRecording, error, secondsRemaining, startRecording, stopRecording, resetTranscript }`

**Audio Pipeline:**
1. `getUserMedia({ echoCancellation: true, noiseSuppression: true, sampleRate: 16000 })`
2. `AudioContext` at 16kHz → `MediaStreamAudioSourceNode` → `ScriptProcessorNode(4096, 1, 1)`
3. `onaudioprocess`: Float32 → `pcmEncode()` (clamp to [-1,1], multiply by 0x8000/0x7fff, little-endian Int16) → push to buffer queue
4. Async generator yields `{ AudioEvent: { AudioChunk: chunk } }` from queue (100ms poll timeout)
5. `StartStreamTranscriptionCommand` with `IdentifyLanguage: true`, `LanguageOptions: "en-US,es-US"`, `MediaEncoding: "pcm"`, `MediaSampleRateHertz: 16000`, `EnablePartialResultsStabilization: true`, `PartialResultsStability: "medium"`
6. Result stream: partials → `setPartialTranscript`; finals → `appendFinal`, clear partial

**Voice Command Detection:**
- On each final result, builds "prospective final" (all accumulated finals + new final)
- Normalizes: `toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()`
- If includes "next question": removes phrase via regex `/next[\s.,!?;:]*question/i`, fires `onVoiceCommand('NEXT_QUESTION', cleanedText)`, breaks stream loop

**Cleanup:** Idempotent — disconnects Web Audio nodes, stops mic tracks, destroys Transcribe client, clears timers. Runs in `finally` block, `stopRecording()`, and unmount effect.

### `useTextToSpeech.js`

**Parameters:** `{ region = 'us-east-2', getCredentials, voiceId = 'Ruth' }`

**Returns:** `{ speak(text, audioKey?), stop(), isSpeaking }`

**3-Tier Playback:**
1. **In-memory cache** (`blobCacheRef` Map): audioKey → blob URL. Fastest, survives session.
2. **S3 pre-generated**: `getUrl({ path: audioKey })` → fetch blob → cache → play. Falls back to Polly on error.
3. **Runtime Polly**: `SynthesizeSpeechCommand({ Engine: 'neural', OutputFormat: 'mp3', VoiceId, LanguageCode: 'en-US' })` → stream to blob → play. Client cached by `region:accessKeyId:sessionToken` key.

**Race Condition Prevention:** `speakIdRef` counter incremented on each `speak()`/`stop()`. All async paths check `speakIdRef.current !== currentSpeakId` before playing.

**Blur Handling:** 80ms `setTimeout` delay on `speak()` so blur events can cancel without killing just-started audio.

---

## Admin Page (`AdminPage.jsx`)

### Authentication
Cognito sign-in gate. Email + password form. Checks `fetchAuthSession()` on mount. Unauthorized users see login form only.

### Survey Management
- **Survey list**: dropdown selector, fetches all surveys on auth
- **Share link**: displays `{origin}?survey={id}` with copy-to-clipboard button
- **Create survey**: modal with name input + CSV file upload
  - CSV format: `order,question_text` (header row optional, auto-detected)
  - CSV parser handles quoted fields and escaped quotes (`""`)
  - On create: creates Survey record → creates Question records sorted by order → loops through questions, synthesizes Polly audio, uploads MP3 to S3 (`audio/{surveyId}/{questionId}.mp3`), updates `Question.audioKey`
  - Shows progress spinner with status updates during creation
- **Delete survey**: confirmation modal requiring typed survey name
  - Cascade: deletes all Submissions (paginated) → fetches all Questions (paginated), collects audioKeys → deletes S3 audio files → deletes Questions → deletes Survey

### Submissions Table
- Columns: Name, Email (hidden mobile), Industry (hidden mobile), Submitted At, View
- **View modal**: shows respondent info header + question/answer pairs parsed from `responses` JSON
- **CSV export**: `sanitizeCell()` removes leading formula characters (`=`, `+`, `-`, `@`, tab, return) for injection safety. Collects all unique question texts, builds header row, escapes and quotes all cells, downloads as `submissions.csv`

### Styling
Primarily inline style objects (`const styles = {...}`). Co-located `AdminPage.css` handles responsive breakpoints (640px): hides email/industry columns, reduces padding, stretches buttons.

---

## Styling System

- **Palette:** white, light gray (`#f8fafc`), dark text (`#1a1a2e`), gray (`#6b7280`), blue (`#2563eb`), red (`#dc2626`/`#ef4444`)
- **Page background:** `#D4DCE6` with radial gradient pattern (from `index.css`)
- **Font:** Syne + system fallbacks, antialiased
- Components use co-located `.css` files (except AdminPage which uses inline styles)
- Cards: white bg, `#dde3ed` border, 16px border-radius, subtle shadows (0 1px 3px + 0 4px 16px)
- Buttons: no box shadows. Hover = color change only.
- Focus states: blue border + light blue shadow ring (3px, rgba)
- Voice states: blue (`#2563eb`) record, red (`#f44336`) stop, green (`#4CAF50`) confirm, gray (`#6b7280`) re-record
- Partial transcript: italic, `#888`. Final transcript: normal weight, full color.
- Recording indicator: pulsing red dot animation (scale + opacity keyframes)
- Countdown: tabular numbers, orange + blink animation when ≤5s remaining
- **Animations:** fade-up (0.35s) for list items with staggered delays, pop animation for success checkmark, pulse ring for recording
- **Responsive:** single breakpoint at ~600-640px. Reduces padding, font sizes, hides table columns, stretches buttons. Textarea min-height 120px → 80px on mobile.

---

## Vite Configuration (`vite.config.js`)

- React plugin (Fast Refresh)
- **Code splitting** via `manualChunks`:
  - `aws-sdk` chunk: `@aws-sdk/client-transcribe-streaming`
  - `aws-amplify` chunk: `aws-amplify`, `aws-amplify/auth`, `aws-amplify/data`
- Improves initial load by splitting large AWS libraries into parallel-loaded chunks

---

## Seed Script (`seedquestions.js`)

CLI tool to create a survey with 12 hardcoded hiring-research questions.

```bash
node seedquestions.js --name "Survey Name"                    # Dev (localhost)
node seedquestions.js --name "Survey Name" --url https://app   # Production
node seedquestions.js --name "Name" --api-url https://custom   # Custom API endpoint
```

- Reads `amplify_outputs.json` for AppSync URL and region
- Signs GraphQL requests with AWS SigV4 (`@smithy/signature-v4`)
- Uses NodeJS credential provider chain (`~/.aws/credentials`)
- Creates Survey → creates 12 Questions → prints share link
- Questions cover: context (2), pain (4), solution (3), commitment (3)

---

## Key Constraints & Decisions

- **Do not use the Web Speech API** — it fails silently on iOS. All transcription goes through Amazon Transcribe Streaming via a direct WebSocket from the browser.
- Credentials for Transcribe and Polly are obtained via `fetchAuthSession()` — the Cognito unauthenticated role has `transcribe:StartStreamTranscription`, `transcribe:StartStreamTranscriptionWebSocket`, and `polly:SynthesizeSpeech` permissions granted in `backend.ts`.
- All data access goes through the Amplify Data client (`generateClient()`).
- **Do not hardcode questions** in React components. Questions are fetched from DynamoDB.
- **Do not store API keys or secrets in code.** AWS access is managed entirely through IAM roles provisioned by Amplify.
- **No S3 bucket is needed for transcription.** Audio streams directly from the browser to Transcribe. S3 is only used for pre-generated question audio (TTS).
- **Audio configuration must match.** The sample rate in `getUserMedia` (16000) must match `MediaSampleRateHertz` in `StartStreamTranscriptionCommand` (16000). Mismatches cause garbled audio.
- **HTTPS required for microphone access.** `getUserMedia` requires a secure context. Localhost is exempt during development.
- The app must work on mobile, including iPhone Safari.
- **Amplify Gen 2 only** — do not use Gen 1 CLI commands (`amplify add`, `amplify push`). All backend resources are defined as TypeScript in the `amplify/` directory.
- The `amplify_outputs.json` file is auto-generated. Do not edit it manually. It is regenerated each time `npx ampx sandbox` runs or a deployment completes.
- **ScriptProcessorNode** is used for audio capture (deprecated but widely supported). Buffer size is 4096 samples for balance between latency and CPU.
- **Polly neural engine** is used for TTS (higher quality than standard). Voice: "Ruth", language: "en-US", output: MP3.
- **localStorage autosave** is keyed by `survey_autosave_{surveyId}` and cleared on successful submission.
- **Duplicate submission prevention** checks for existing submission with same email + surveyId before creating.

---

## Environment Variables & Secrets

No API keys are needed in the codebase or environment. AWS credentials are handled through IAM roles:

- **Frontend** connects to backend services via `amplify_outputs.json` (auto-generated)
- **Transcribe + Polly access** is granted to both Cognito identity roles in `backend.ts` — credentials retrieved at runtime via `fetchAuthSession()`, never hardcoded
- **S3 audio access** is controlled by Amplify Storage access rules (guest read, auth read/write on `audio/*`)
- **Local development** requires AWS credentials configured via `aws configure` (profile with PowerUserAccess or AdministratorAccess-Amplify)

If any third-party secrets are needed in the future, use Amplify's `secret()` function in resource definitions, and set values via:
```bash
npx ampx sandbox secret set SECRET_NAME
```

---

## Dependencies

### Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI library |
| `react-dom` | ^19.2.0 | DOM rendering |
| `react-router-dom` | ^7.13.1 | Client-side routing |
| `aws-amplify` | ^6.16.2 | Auth, data (AppSync/DynamoDB), storage (S3) |
| `@aws-sdk/client-transcribe-streaming` | ^3.1006.0 | Real-time transcription WebSocket |
| `@aws-sdk/client-polly` | ^3.1009.0 | Text-to-speech synthesis |
| `lucide-react` | ^0.576.0 | Icons |

### Dev
| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-amplify/backend` | ^1.21.0 | Backend resource definitions |
| `@aws-amplify/backend-cli` | ^1.8.2 | Amplify CLI (`npx ampx`) |
| `aws-cdk-lib` | ^2.234.1 | CDK constructs (IAM policies) |
| `constructs` | ^10.5.1 | CDK base |
| `vite` | ^7.3.1 | Frontend bundler |
| `@vitejs/plugin-react` | ^5.1.1 | React Fast Refresh |
| `typescript` | ^5.9.3 | Type checking (backend) |
| `tsx` | ^4.21.0 | Run .ts files |
| `esbuild` | ^0.27.3 | Fast bundler (Vite internal) |
| `eslint` | ^9.39.1 | Linting |

---

## Troubleshooting

| Problem | Check |
|---|---|
| Mic permission denied | Site must be HTTPS (localhost exempt in dev) |
| WebSocket fails | Check `backend.ts` IAM policy on the unauthenticated role; verify `fetchAuthSession()` returns valid credentials; confirm region supports Transcribe Streaming |
| Bad transcription | Add Custom Vocabulary in Transcribe with domain terms |
| Audio gaps / cutouts | PCM sample rate must match `MediaSampleRateHertz` (both 16000) |
| High latency on mobile | Reduce ScriptProcessorNode buffer size for more frequent chunks |
| iPhone mic not working | Needs HTTPS + user gesture to start audio capture in Safari |
| TTS not playing | Check Polly permissions in `backend.ts`; verify `audioKey` in Question record; check S3 storage access rules |
| TTS plays wrong audio | Check `speakIdRef` race condition; verify blob cache isn't stale |
| Voice command not detected | Phrase must be "next question" (case-insensitive, punctuation stripped); check `normalizedProspective` in hook |
| CSV import errors | CSV must have `order,question_text` columns; order must be positive integers, no duplicates |
| Duplicate submission blocked | Same email + surveyId already exists in Submissions table |
| Autosave not restoring | Question count must match saved response count; check `localStorage` key format |

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

# Lint
npm run lint
```

### Local Dev Flow
1. `npx ampx sandbox` → deploys dev backend, generates `amplify_outputs.json`.
2. `npm run dev` → Vite at `http://localhost:5173`.
3. `node seedquestions.js --name "Test"` → prints link like `http://localhost:5173?survey=<id>`.
4. Open link to test end-to-end.
5. Backend edits in `amplify/` → sandbox auto-redeploys. Frontend edits → Vite hot-reloads.

### Deployment
Push to `main`. Amplify Hosting auto-builds and deploys frontend + backend.
