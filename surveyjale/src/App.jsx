import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import { Send } from 'lucide-react';
import { useState, useEffect } from 'react';
// TODO: Uncomment for amplify to work
import { generateClient } from 'aws-amplify/data';

const client = generateClient();

function App() {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch questions from DynamoDB on load
  useEffect(() => {
    // TODO: Uncomment as this is how questions are fetched from DynamoDB
    // async function fetchQuestions() {
    //   const { data } = await client.models.Question.list();
    //   const sorted = [...data].sort((a, b) => a.order - b.order);
    //   setQuestions(sorted);
    //   setResponses(new Array(sorted.length).fill(''));
    // }
    // fetchQuestions();

    // TODO: =======================
    // Temp Mock Data
    const mockQuestions = [
      { id: '1', text: 'What is your name?', order: 1 },
      { id: '2', text: 'What is your favorite color?', order: 2 },
      { id: '3', text: 'What is your favorite food?', order: 3 },
    ];
    setQuestions(mockQuestions);
    setResponses(new Array(mockQuestions.length).fill(''));
  }, []);

  const handleResponseChange = (index, value) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Submit each response to DynamoDB
      await Promise.all(
        questions.map((q, index) =>
          client.models.Response.create({
            questionId: q.id,
            responseText: responses[index],
          })
        )
      );
      setSubmitted(true);
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

  if (submitted) {
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
              questionNumber={index + 1}
              questionText={q.text}
              value={responses[index]}
              onChange={(value) => handleResponseChange(index, value)}
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