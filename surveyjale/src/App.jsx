import './App.css';
import Question from './Components/Question';
import FormHeader from './Components/FormHeader';
import { Send } from 'lucide-react';
import { useState } from 'react';

const questions = [
  { id: 1, text: "How satisfied are you with our service overall?" },
  { id: 2, text: "What did we do well during your experience with us?" },
  { id: 3, text: "What could we have done better?" },
  { id: 4, text: "How likely are you to recommend us to a friend or colleague?" },
  { id: 5, text: "Is there anything else you would like to share with us?" },
];



function App() {
  const [responses, setResponses] = useState(
    new Array(questions.length).fill('')
  );

  const handleResponseChange = (index, value) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(responses);
  };

  const handleClear = () => {
    console.log('Clear');
    setResponses(new Array(questions.length).fill(''));
  };

  return (
    <div className="App">
      <FormHeader />
      {/* Questions Section */}
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
      {/* Submit section */}
      <div className='submit-btn-wrapper'>
        <button className='submit-btn' onClick={handleSubmit}>
          <Send size={18} />
          Submit
        </button>
        <p className='clear-btn' onClick={handleClear}>
          Clear Form
        </p>
      </div>
    </div>
  );
}

export default App;
