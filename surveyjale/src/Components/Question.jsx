import './Question.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import VoiceRecorder from './VoiceRecorder';

function Question({
    questionNumber = 1,
    questionText = "What is your response?",
    value,
    onChange
}) {
    const handleTranscriptConfirmed = (text) => {
        onChange(value ? `${value} ${text}` : text);
    };

    return (
        <div className="question-container form-card-shadow">
            <h2>
                {questionNumber}. {questionText}
                <span className="text-required"> *</span>
            </h2>
            <div className="question-content-wrapper">
                <div className="question-textarea-wrapper">
                    <textarea
                        className="question-textarea"
                        placeholder="Type your response here..."
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            </div>
            <VoiceRecorder
                region="us-east-2"
                languageOptions="en-US,es-US"
                getCredentials={async () => {
                    const { credentials } = await fetchAuthSession();
                    return credentials;
                }}
                onTranscriptConfirmed={handleTranscriptConfirmed}
            />
        </div>
    );
}

export default Question;