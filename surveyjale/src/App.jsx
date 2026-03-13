import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import UserInfoStep from './Components/UserInfoStep';
import SuccessStep from './Components/SuccessStep';
import { Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
// TODO: Uncomment for amplify to work
import { generateClient } from 'aws-amplify/data';
import AdminPage from './pages/AdminPage';

const client = generateClient();

function SurveyApp() {
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('survey');

  const [step, setStep] = useState('info'); // 'info' | 'survey' | 'submitted'
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentIndustry, setRespondentIndustry] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const questionRefs = useRef([]);

  // Fetch questions from DynamoDB on load
  useEffect(() => {
    if (!surveyId) return;
    async function fetchQuestions() {
      try {
        const { data } = await client.models.Question.list({
          filter: { surveyId: { eq: surveyId } },
        });
        const sorted = [...data].filter(Boolean).sort((a, b) => a.order - b.order);
        if (sorted.length === 0) {
          console.warn('No questions returned for surveyId:', surveyId);
        }
        setQuestions(sorted);
        setResponses(new Array(sorted.length).fill(''));
      } catch (err) {
        console.error('fetchQuestions failed:', err);
        setFetchError(true);
      }
    }
    fetchQuestions();
  }, [surveyId]);

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
  };

  const handleVoiceCommand = (index, command) => {
    if (command === 'NEXT_QUESTION') {
      if (index + 1 < questions.length) {
        questionRefs.current[index + 1]?.focus();
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
      await client.models.Submission.create({
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
      });
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
            />
          </li>
        ))}
      </ul>
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
      <Route path="/*" element={<SurveyApp />} />
    </Routes>
  );
}

export default App;
