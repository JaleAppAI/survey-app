import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import UserInfoStep from './Components/UserInfoStep';
import { Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Routes, Route } from 'react-router-dom';
import AdminPage from './pages/AdminPage';

const client = generateClient();

function SurveyApp() {
  const surveyId = new URLSearchParams(window.location.search).get('survey');

  const [step, setStep] = useState('info'); // 'info' | 'survey' | 'submitted'
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorIndices, setErrorIndices] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const questionRefs = useRef([]);

  useEffect(() => {
    if (!surveyId) {
      setLoading(false);
      return;
    }
    async function fetchQuestions() {
      const { data } = await client.models.Question.list({
        filter: { surveyId: { eq: surveyId } },
      });
      const sorted = [...data].sort((a, b) => a.order - b.order);
      setQuestions(sorted);

      // Restore from localStorage if available
      const saved = localStorage.getItem(`survey-${surveyId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === sorted.length) {
            setResponses(parsed);
          } else {
            setResponses(new Array(sorted.length).fill(''));
          }
        } catch {
          setResponses(new Array(sorted.length).fill(''));
        }
      } else {
        setResponses(new Array(sorted.length).fill(''));
      }

      setLoading(false);
    }
    fetchQuestions();
  }, []);

  // Autosave responses to localStorage
  useEffect(() => {
    if (!surveyId || step !== 'survey' || responses.length === 0) return;
    localStorage.setItem(`survey-${surveyId}`, JSON.stringify(responses));
  }, [responses, step, surveyId]);

  const handleInfoComplete = (name, email) => {
    setRespondentName(name);
    setRespondentEmail(email);
    setStep('survey');
  };

  const handleResponseChange = (index, value) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
    if (errorIndices.includes(index)) {
      setErrorIndices(prev => prev.filter(i => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate: find empty responses
    const emptyIndices = responses.reduce((acc, r, i) => {
      if (!r.trim()) acc.push(i);
      return acc;
    }, []);

    if (emptyIndices.length > 0) {
      setErrorIndices(emptyIndices);
      const firstRef = questionRefs.current[emptyIndices[0]];
      if (firstRef) {
        firstRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // Duplicate submission check
      const { data: existing } = await client.models.Submission.list({
        filter: {
          surveyId: { eq: surveyId },
          respondentEmail: { eq: respondentEmail },
        },
      });
      if (existing.length > 0) {
        setSubmitError("You've already submitted this survey with this email address.");
        setSubmitting(false);
        return;
      }

      await client.models.Submission.create({
        respondentName: respondentName || undefined,
        respondentEmail,
        responses: JSON.stringify(
          questions.map((q, index) => ({
            questionId: q.id,
            questionText: q.text,
            responseText: responses[index],
          }))
        ),
        surveyId,
      });

      localStorage.removeItem(`survey-${surveyId}`);
      setStep('submitted');
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setResponses(new Array(questions.length).fill(''));
    setErrorIndices([]);
    setSubmitError('');
  };

  if (!surveyId) {
    return (
      <div className="App">
        <div style={{
          maxWidth: 620,
          margin: '80px auto',
          textAlign: 'center',
          fontFamily: 'Syne, sans-serif'
        }}>
          <h1>Invalid survey link</h1>
          <p>Please use the link provided to you to access this survey.</p>
        </div>
      </div>
    );
  }

  if (step === 'info') {
    return (
      <div className="App">
        <UserInfoStep onComplete={handleInfoComplete} />
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className="App">
        <div style={{
          maxWidth: 620,
          margin: '80px auto',
          textAlign: 'center',
          fontFamily: 'Syne, sans-serif'
        }}>
          <h1>Thank you!</h1>
          <p>Your responses have been submitted.</p>
        </div>
      </div>
    );
  }

  const answeredCount = responses.filter(r => r.trim() !== '').length;
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="App">
      <FormHeader />

      {/* Progress bar */}
      <div className="progress-wrapper">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="progress-label">
          {answeredCount} of {questions.length} answered
        </span>
      </div>

      {loading ? (
        <ul>
          {[1, 2, 3, 4].map(n => (
            <li key={n}>
              <div className="skeleton-card">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-body" />
                <div className="skeleton-line skeleton-body skeleton-body--short" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {questions.map((q, index) => (
            <li key={q.id} ref={el => questionRefs.current[index] = el}>
              <Question
                questionNumber={index + 1}
                questionText={q.text}
                value={responses[index]}
                onChange={(value) => handleResponseChange(index, value)}
                hasError={errorIndices.includes(index)}
              />
            </li>
          ))}
        </ul>
      )}

      {submitError && (
        <p className="submit-error-msg">{submitError}</p>
      )}

      <div className="submit-btn-wrapper">
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
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<SurveyApp />} />
    </Routes>
  );
}

export default App;
