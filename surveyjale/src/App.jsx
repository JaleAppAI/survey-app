import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import UserInfoStep from './Components/UserInfoStep';
import SuccessStep from './Components/SuccessStep';
import { Send } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import ErrorBoundary from './Components/ErrorBoundary';
import { Routes, Route, useSearchParams, Navigate } from 'react-router-dom';
// TODO: Uncomment for amplify to work
import { generateClient } from 'aws-amplify/data';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useTextToSpeech } from './hooks/useTextToSpeech';

const AdminPage = lazy(() => import('./pages/AdminPage'));

let _client;
function getClient() {
  if (!_client) _client = generateClient();
  return _client;
}

function SurveyApp() {
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('survey');

  const [step, setStep] = useState('info'); // 'info' | 'survey' | 'submitted'
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentIndustry, setRespondentIndustry] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState(() => {
    if (!surveyId) return [];
    try {
      const saved = localStorage.getItem(`survey_autosave_${surveyId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const questionRefs = useRef([]);

  const getCredentials = useCallback(async () => {
    const { credentials } = await fetchAuthSession();
    return credentials;
  }, []);

  const { speak, stop, isSpeaking } = useTextToSpeech({ getCredentials });

  // Detect auth state and resolve authMode
  useEffect(() => {
    async function detectAuth() {
      try {
        const session = await fetchAuthSession();
        setAuthMode(session.tokens ? 'userPool' : 'identityPool');
      } catch {
        setAuthMode('identityPool');
      }
    }
    detectAuth();
  }, []);

  // Reset speakingIndex when TTS finishes
  useEffect(() => {
    if (!isSpeaking) setSpeakingIndex(null);
  }, [isSpeaking]);

  // Fetch questions from DynamoDB on load
  useEffect(() => {
    if (!surveyId || !authMode) return;
    async function fetchQuestions() {
      try {
        const { data } = await getClient().models.Question.list({
          filter: { surveyId: { eq: surveyId } },
          authMode,
        });
        const sorted = [...data].filter(Boolean).sort((a, b) => a.order - b.order);
        if (sorted.length === 0) {
          console.warn('No questions returned for surveyId:', surveyId);
        }
        setQuestions(sorted);
        // Restore autosaved responses if they match question count, otherwise start fresh
        try {
          const saved = localStorage.getItem(`survey_autosave_${surveyId}`);
          const parsed = saved ? JSON.parse(saved) : null;
          if (parsed && Array.isArray(parsed) && parsed.length === sorted.length) {
            setResponses(parsed);
          } else {
            setResponses(new Array(sorted.length).fill(''));
          }
        } catch {
          setResponses(new Array(sorted.length).fill(''));
        }
      } catch (err) {
        console.error('fetchQuestions failed:', err);
        setFetchError(true);
      }
    }
    fetchQuestions();
  }, [surveyId, authMode]);

  // Autosave responses to localStorage
  useEffect(() => {
    if (!surveyId || responses.length === 0) return;
    try {
      localStorage.setItem(`survey_autosave_${surveyId}`, JSON.stringify(responses));
    } catch { /* quota exceeded — silently ignore */ }
  }, [responses, surveyId]);

  const handleInfoComplete = (name, email, industry) => {
    setRespondentName(name);
    setRespondentEmail(email);
    setRespondentIndustry(industry);
    setStep('survey');
  };

  const handleResponseChange = (index, value) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = false;
      setErrors(newErrors);
    }
    if (submitError) setSubmitError('');
  };

  const handleVoiceCommand = (index, command) => {
    if (command === 'NEXT_QUESTION') {
      if (index + 1 < questions.length) {
        questionRefs.current[index + 1]?.focus();
        setRecordingIndex(index + 1);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newErrors = responses.map(r => !r.trim());
    if (newErrors.some(Boolean)) {
      setErrors(newErrors);
      setTimeout(() => {
        document.querySelector('.question-container--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      setSubmitting(false);
      return;
    }

    try {
      // Check for duplicate submission
      const { data: existing } = await getClient().models.Submission.list({
        filter: {
          surveyId: { eq: surveyId },
          respondentEmail: { eq: respondentEmail },
        },
        authMode,
      });
      if (existing && existing.length > 0) {
        setSubmitError('You have already submitted a response for this survey.');
        setSubmitting(false);
        return;
      }

      await getClient().models.Submission.create({
        respondentName,
        respondentEmail,
        respondentIndustry,
        responses: JSON.stringify(
          questions.map((q, index) => ({
            questionId: q.id,
            questionText: q.text,
            responseText: responses[index],
          }))
        ),
        surveyId,
      }, { authMode });
      localStorage.removeItem(`survey_autosave_${surveyId}`);
      setStep('submitted');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setResponses(new Array(questions.length).fill(''));
  };

  if (!surveyId) {
    return <Navigate to="/admin" replace />;
  }

  if (step === 'info') {
    return (
      <div className="App">
        <UserInfoStep onComplete={handleInfoComplete} />
      </div>
    );
  }

  if (step === 'submitted') {
    return <div className="App"><SuccessStep name={respondentName} /></div>;
  }

  if (fetchError || (step === 'survey' && questions.length === 0)) {
    return (
      <div className="App">
        <div style={{
          maxWidth: 620,
          margin: '80px auto',
          textAlign: 'center',
          fontFamily: 'Syne, sans-serif'
        }}>
          <h1>Failed to load survey questions</h1>
          <p>Check the browser console for details, or verify your survey link is correct.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <FormHeader />
      <ul>
        {questions.map((q, index) => (
          <li key={q.id}>
            <Question
              inputRef={(el) => (questionRefs.current[index] = el)}
              questionNumber={index + 1}
              questionText={q.text}
              value={responses[index]}
              onChange={(value) => handleResponseChange(index, value)}
              hasError={errors[index] || false}
              onVoiceCommand={(command) => handleVoiceCommand(index, command)}
              autoStartRecording={recordingIndex === index}
              onRecordingStarted={() => setRecordingIndex(null)}
              audioKey={q.audioKey}
              speak={(text, audioKey) => { setSpeakingIndex(index); speak(text, audioKey); }}
              stopSpeaking={stop}
              isSpeaking={isSpeaking && speakingIndex === index}
              isLastQuestion={index === questions.length - 1}
            />
          </li>
        ))}
      </ul>
      <div className="submit-btn-wrapper">
        {submitError && (
          <p className="submit-error">{submitError}</p>
        )}
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send size={18} />
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        <p className="clear-btn" onClick={handleClear}>
          Clear Form
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/admin" element={
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '80px 16px', fontFamily: 'Syne, sans-serif', color: '#64748b' }}>Loading...</div>}>
          <ErrorBoundary>
            <AdminPage />
          </ErrorBoundary>
        </Suspense>
      } />
      <Route path="/*" element={<SurveyApp />} />
    </Routes>
  );
}

export default App;
