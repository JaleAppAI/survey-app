import { FileText } from 'lucide-react';
import './FormHeader.css';

function FormHeader() {
    return (
        <header className="form-header form-card-shadow">
            <h1>Employer Discovery Survey</h1>
            <p>
                Hi there—thanks for taking a few minutes to help us fix hourly hiring.
            </p>
            <p>
                We know that for managers like you, the biggest thief of your time isn't
                the work itself—it's the constant cycle of sorting through bad apps, chasing
                ghosters, and training people who don't show up. We're rebuilding Jale AI to
                automate the "busy work" so you can hire the right person in minutes, not days.
            </p>
            <p>
                We're going to ask you 8 quick questions. Please don't worry about being
                formal—speak naturally, vent a little if you need to, and tell us the real
                stories of what's working and what isn't. Your voice is literally going to
                build the features of this platform.
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
