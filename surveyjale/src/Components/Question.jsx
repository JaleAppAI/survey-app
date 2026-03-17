import { useState, useCallback } from 'react';
import './Question.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Volume2, VolumeX } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

function Question({
    questionNumber = 1,
    questionText = "What is your response?",
    value,
    onChange,
    inputRef,
    onVoiceCommand,
    hasError = false,
    autoStartRecording,
    onRecordingStarted,
    audioKey,
    speak,
    stopSpeaking,
    isSpeaking = false,
    isLastQuestion = false,
}) {
    const [liveFinal, setLiveFinal] = useState("");
    const [livePartial, setLivePartial] = useState("");

    const getCredentials = useCallback(async () => {
        const { credentials } = await fetchAuthSession();
        return credentials;
    }, []);

    const handleTranscriptConfirmed = (text) => {
        onChange(value ? `${value} ${text}` : text);
    };

    const handlePlayQuestion = () => {
        if (isSpeaking) {
            stopSpeaking();
        } else {
            speak(questionText, audioKey);
        }
    };

    const hasLiveAudio = liveFinal || livePartial;
    const displayValue = hasLiveAudio
        ? `${value ? value + ' ' : ''}${liveFinal} ${livePartial}`.replace(/\s+/g, ' ').trim()
        : value;

    return (
        <div className={`question-container form-card-shadow${hasError ? ' question-container--error' : ''}`}>
            <div className="question-header">
                <h2>
                    {questionNumber}. {questionText}
                    <span className="text-required"> *</span>
                </h2>
                <button
                    type="button"
                    className={`question-play-btn${isSpeaking ? ' question-play-btn--active' : ''}`}
                    onClick={handlePlayQuestion}
                    title={isSpeaking ? 'Stop reading' : 'Listen to question'}
                >
                    {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            </div>
            <div className="question-content-wrapper">
                <div className="question-textarea-wrapper">
                    <textarea
                        ref={inputRef}
                        className={`question-textarea${hasError ? ' question-textarea--error' : ''}`}
                        placeholder="Type your response here..."
                        value={displayValue}
                        readOnly={!!hasLiveAudio}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={5000}
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
                maxRecordingMs={30000}
                isLastQuestion={isLastQuestion}
            />
        </div>
    );
}

export default Question;
