import './App.css';
import Question from './Components/Question';

const questions = [
  { id: 1, text: "How satisfied are you with our service overall?" },
  { id: 2, text: "What did we do well during your experience with us?" },
  { id: 3, text: "What could we have done better?" },
  { id: 4, text: "How likely are you to recommend us to a friend or colleague?" },
  { id: 5, text: "Is there anything else you would like to share with us?" },
];

function App() {
  return (
    <div className="App">
      <ol>
        {questions.map((q) => (
          <li key={q.id}>
            <Question questionText={q.text} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export default App;
