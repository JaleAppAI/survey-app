import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import UserInfoStep from './Components/UserInfoStep';
import SuccessStep from './Components/SuccessStep';
import { Send } from 'lucide-react';
import { useState, useEffect } from 'react';
// TODO: Uncomment for amplify to work
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

const surveyId = new URLSearchParams(window.location.search).get('survey');

function App() {
  const [step, setStep] = useState('info'); // 'info' | 'survey' | 'submitted'
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  // Fetch questions from DynamoDB on load
  useEffect(() => {
    if (!surveyId) return;
    async function fetchQuestions() {
      const { data } = await client.models.Question.list({
        filter: { surveyId: { eq: surveyId } },
      });
      const sorted = [...data].sort((a, b) => a.order - b.order);
      setQuestions(sorted);
      setResponses(new Array(sorted.length).fill(''));
    }
    fetchQuestions();
  }, []);

  const handleInfoComplete = (name, email) => {
    setRespondentName(name);
    setRespondentEmail(email);
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

  return (
    <div className="App">
      <FormHeader />
      <ul>
        {questions.map((q, index) => (
          <li key={q.id}>
            <Question
              questionNumber={index + 1}
              questionText={q.text}
              value={responses[index]}
              onChange={(value) => handleResponseChange(index, value)}
              hasError={errors[index] || false}
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

export default App;
