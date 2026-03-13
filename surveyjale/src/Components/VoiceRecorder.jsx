import { useState, useEffect } from 'react';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import { Mic, Square, Check, RotateCcw } from 'lucide-react';
import './VoiceRecorder.css';

export default function VoiceRecorder({
    region,
    languageOptions,
    getCredentials,
    onTranscriptConfirmed,
    onVoiceCommand,
    onLiveTranscriptChange,
    onTranscriptCleared,
    autoStartRecording,
    onRecordingStarted,
    onRecordStart,
}) {
    const handleVoiceCommand = (command, finalTranscriptParam) => {
        if (command === 'NEXT_QUESTION') {
            stopRecording();
            setConfirmed(true);
            const transcriptToSave = finalTranscriptParam !== undefined ? finalTranscriptParam : finalTranscript;
            onTranscriptConfirmed?.(transcriptToSave);
            onVoiceCommand?.(command);

            // Allow React cycle to flush the confirmed transcript up to the Question component 
            // before we blank it out locally
            setTimeout(() => {
                resetTranscript();
            }, 50);
        }
    };

    const {
        partialTranscript,
        finalTranscript,
        isRecording,
        error,
        startRecording,
        stopRecording,
        resetTranscript,
    } = useRealtimeTranscription({
        region,
        languageOptions,
        getCredentials,
        onVoiceCommand: handleVoiceCommand
    });

    const [confirmed, setConfirmed] = useState(false);

    const handleConfirm = () => {
        setConfirmed(true);
        onTranscriptConfirmed?.(finalTranscript);
        resetTranscript();
    };

    const handleReRecord = () => {
        setConfirmed(false);
        resetTranscript();
        onTranscriptCleared?.();
    };

    useEffect(() => {
        if (autoStartRecording) {
            startRecording();
            onRecordingStarted?.();
        }
    }, [autoStartRecording, startRecording, onRecordingStarted]);

    useEffect(() => {
        onLiveTranscriptChange?.(finalTranscript, partialTranscript);
    }, [finalTranscript, partialTranscript, onLiveTranscriptChange]);

    return (
        <div className="voice-recorder">
            {error && <div className="voice-recorder-error">{error}</div>}

            {isRecording && (
                <div className="voice-recorder-indicator">
                    <span className="voice-recorder-dot" />
                    Recording — speak now
                </div>
            )}

            <div className="voice-recorder-controls">
                {confirmed ? (
                    <button
                        className="voice-recorder-btn voice-recorder-btn--rerecord"
                        onClick={handleReRecord}
                    >
                        <RotateCcw size={16} />
                        Re-record
                    </button>
                ) : isRecording ? (
                    <button
                        className="voice-recorder-btn voice-recorder-btn--stop"
                        onClick={stopRecording}
                    >
                        <Square size={16} />
                        Stop
                    </button>
                ) : finalTranscript ? (
                    <>
                        <button
                            className="voice-recorder-btn voice-recorder-btn--confirm"
                            onClick={handleConfirm}
                        >
                            <Check size={16} />
                            Confirm
                        </button>
                        <button
                            className="voice-recorder-btn voice-recorder-btn--rerecord"
                            onClick={handleReRecord}
                        >
                            <RotateCcw size={16} />
                            Re-record
                        </button>
                    </>
                ) : (
                    <button
                        className="voice-recorder-btn voice-recorder-btn--record"
                        onClick={() => {
                            onRecordStart?.();
                            startRecording();
                        }}
                    >
                        <Mic size={16} />
                        Record
                    </button>
                )}
            </div>
        </div>
    );
}
