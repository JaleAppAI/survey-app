import { useState } from 'react';
import './Question.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import VoiceRecorder from './VoiceRecorder';

function Question({
    questionNumber = 1,
    questionText = "What is your response?",
    value,
    onChange,
    inputRef,
    onVoiceCommand,
    hasError = false
}) {
    const [liveFinal, setLiveFinal] = useState("");
    const [livePartial, setLivePartial] = useState("");

    const handleTranscriptConfirmed = (text) => {
        onChange(value ? `${value} ${text}` : text);
    };

    const hasLiveAudio = liveFinal || livePartial;
    const displayValue = hasLiveAudio
        ? `${value ? value + ' ' : ''}${liveFinal} ${livePartial}`.replace(/\s+/g, ' ').trim()
        : value;

    return (
        <div className={`question-container form-card-shadow${hasError ? ' question-container--error' : ''}`}>
            <h2>
                {questionNumber}. {questionText}
                <span className="text-required"> *</span>
            </h2>
            <div className="question-content-wrapper">
                <div className="question-textarea-wrapper">
                    <textarea
                        ref={inputRef}
                        className={`question-textarea${hasError ? ' question-textarea--error' : ''}`}
                        placeholder="Type your response here..."
                        value={displayValue}
                        readOnly={!!hasLiveAudio}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    {hasError && <p className="question-error-msg">This field is required.</p>}
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
                onVoiceCommand={onVoiceCommand}
                onLiveTranscriptChange={(final, partial) => {
                    setLiveFinal(final);
                    setLivePartial(partial);
                }}
                onTranscriptCleared={() => onChange('')}
            />
        </div>
    );
}

export default Question;