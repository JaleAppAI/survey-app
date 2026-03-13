import { useState, useCallback } from 'react';
import './Question.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import VoiceRecorder from './VoiceRecorder';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

function Question({
    questionNumber = 1,
    questionText = "What is your response?",
    value,
    onChange,
    inputRef,
    onVoiceCommand,
    hasError = false,
    autoStartRecording,
    onRecordingStarted
}) {
    const [liveFinal, setLiveFinal] = useState("");
    const [livePartial, setLivePartial] = useState("");

    const getCredentials = useCallback(async () => {
        const { credentials } = await fetchAuthSession();
        return credentials;
    }, []);

    const { speak } = useTextToSpeech({ getCredentials });

    const speakQuestion = () => {
        speak(questionText);
    };

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
                        onFocus={speakQuestion}
                    />
                    {hasError && <p className="question-error-msg">This field is required.</p>}
                </div>
            </div>
            <VoiceRecorder
                region="us-east-2"
                languageOptions="en-US,es-US"
                getCredentials={getCredentials}
                onTranscriptConfirmed={handleTranscriptConfirmed}
                onVoiceCommand={onVoiceCommand}
                onLiveTranscriptChange={(final, partial) => {
                    setLiveFinal(final);
                    setLivePartial(partial);
                }}
                onTranscriptCleared={() => onChange('')}
                autoStartRecording={autoStartRecording}
                onRecordingStarted={onRecordingStarted}
                onRecordStart={speakQuestion}
            />
        </div>
    );
}

export default Question;