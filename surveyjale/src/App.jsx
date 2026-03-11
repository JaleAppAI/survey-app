import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import UserInfoStep from './Components/UserInfoStep';
import { Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
// TODO: Uncomment for amplify to work
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

function App() {
  const [step, setStep] = useState('info'); // 'info' | 'survey' | 'submitted'
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const questionRefs = useRef([]);

  // Fetch questions from DynamoDB on load
  useEffect(() => {
    // TODO: Uncomment as this is how questions are fetched from DynamoDB
    async function fetchQuestions() {
      const { data } = await client.models.Question.list();
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

    try {
      console.log(responses);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit. Please try again.');
    }
    // try {
    //   await client.models.Submission.create({
    //     respondentName: respondentName || undefined,
    //     respondentEmail,
    //     responses: JSON.stringify(
    //       questions.map((q, index) => ({
    //         questionId: q.id,
    //         questionText: q.text,
    //         responseText: responses[index],
    //       }))
    //     ),
    //   });
    //   setStep('submitted');
    // } catch (err) {
    //   console.error('Submit failed:', err);
    //   alert('Failed to submit. Please try again.');
    // } finally {
    //   setSubmitting(false);
    // }
  };

  const handleClear = () => {
    setResponses(new Array(questions.length).fill(''));
  };

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

export default App;
