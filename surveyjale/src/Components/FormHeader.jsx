import { FileText } from 'lucide-react';
import './FormHeader.css';

function FormHeader() {
    return (
        <header className="form-header form-card-shadow">
            <h1>Employer Discovery Survey</h1>
            <p>
                Hi there thanks for taking a few minutes to help improve hourly hiring.
                We're building JaleAI to make hiring faster, easier, and more effective.
            </p>
            <p>
                We'll ask 8 quick questions. Speak naturally, be honest, and tell us what's really happening,
                your answers will directly shape the platform.
            </p>
            <p>
                You can type in the box provided or tap the microphone button to speak your answers,
                then say "Next Question" to move ahead automatically.
            </p>
            <p>
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
