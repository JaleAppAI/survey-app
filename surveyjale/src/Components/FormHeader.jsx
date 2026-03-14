import { FileText } from 'lucide-react';
import './FormHeader.css';

function FormHeader() {
    return (
        <header className="form-header form-card-shadow">
            <h1>Feedback Survey</h1>
            <p>
                Please answer the following questions.
                You can type your answers or use the microphone button to dictate them.
                <br />
                <strong>Tip:</strong> Say "Next Question" to automatically move to and start recording the next question.
            </p>
            <p className='text-required-warning'>
                <FileText size={20} />
                <span>
                    <span className='text-required'> *</span> indicates required questions
                </span>
            </p>
        </header>
    );
}

export default FormHeader;
