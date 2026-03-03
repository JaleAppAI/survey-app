import './Question.css';
import { Mic } from 'lucide-react';

function Question({
    questionNumber = 1,
    questionText = "What is your response to this survey question?",
    value,
    onChange
}) {
    return (
        <div className="question-container form-card-shadow">
            <h2>{questionNumber}. {questionText}<span className='text-required'> *</span></h2>
            <div className='question-content-wrapper'>
                <div className="question-textarea-wrapper">
                    <textarea
                        className="question-textarea"
                        placeholder="Type your response here..."
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    ></textarea>
                </div>
                <button
                    onClick={() => { console.log([questionText, value]) }}
                    className="question-record-btn"
                >
                    <Mic />
                </button>
            </div>
        </div>
    );
}
export default Question;
