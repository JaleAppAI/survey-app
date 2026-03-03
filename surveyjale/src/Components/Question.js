import { useState } from 'react';
import './Question.css';

function Question({ questionText = "What is your response to this survey question?" }) {
    const [response, setResponse] = useState('');

    return (
        <div className="question-container">
            <h2>{questionText}</h2>
            <div className="question-textarea-wrapper">
                <textarea
                    className="question-textarea"
                    placeholder="Type your response here..."
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                ></textarea>
            </div>
            <button
                onClick={() => { console.log([questionText, response]) }}
                className="question-record-btn"
            >
                Record (Not Implemented)
            </button>
        </div>
    );
}
export default Question;
