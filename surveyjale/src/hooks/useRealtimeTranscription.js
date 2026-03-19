import { useState, useRef, useCallback, useEffect } from 'react';
import {
    TranscribeStreamingClient,
    StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';

/**
 * Encode Float32 audio samples to 16-bit PCM as Uint8Array.
 * No Node.js Buffer needed — works natively in the browser.
 */
function pcmEncode(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buffer);
}

/**
 * Custom hook for real-time transcription using Amazon Transcribe Streaming.
 *
 * Uses the Web Audio API (ScriptProcessorNode) to capture mic audio,
 * PCM-encodes it, and streams it to Transcribe over a WebSocket.
 *
 * @param {Object} options
 * @param {string} options.region - AWS region (e.g. "us-east-2")
 * @param {string} [options.languageOptions="en-US,es-US"] - Comma-separated language codes for auto-detection
 * @param {() => Promise<{accessKeyId, secretAccessKey, sessionToken}>} options.getCredentials
 * @param {number} [options.maxDurationMs=30000] - Max recording duration in ms (default 30s)
 * @param {() => void} [options.onTimerExpired] - Callback fired when the max-duration timer expires (after recording auto-stops)
 */
export function useRealtimeTranscription({ region, languageOptions, getCredentials, maxDurationMs = 30000, onVoiceCommand, onTimerExpired }) {
    const [partialTranscript, setPartialTranscript] = useState('');
    const partialTranscriptRef = useRef('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const finalTranscriptRef = useRef('');
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(maxDurationMs / 1000));

    const updatePartial = useCallback((val) => {
        setPartialTranscript(val);
        partialTranscriptRef.current = val;
    }, []);

    const updateFinal = useCallback((val) => {
        setFinalTranscript(val);
        finalTranscriptRef.current = val;
    }, []);

    const appendFinal = useCallback((text) => {
        setFinalTranscript((prev) => {
            const next = prev ? prev + ' ' + text : text;
            finalTranscriptRef.current = next;
            return next;
        });
    }, []);

    const audioContextRef = useRef(null);
    const sourceRef = useRef(null);
    const processorRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const clientRef = useRef(null);
    const isStoppedRef = useRef(false);
    const audioBufferQueueRef = useRef([]);
    const resolveAudioChunkRef = useRef(null);
    const timeoutRef = useRef(null);
    const countdownRef = useRef(null);
    const onTimerExpiredRef = useRef(onTimerExpired);
    const stopRecordingRef = useRef(null);

    /**
     * Push a PCM chunk into the queue and wake the async generator if it's waiting.
     */
    const pushAudioChunk = useCallback((chunk) => {
        audioBufferQueueRef.current.push(chunk);
        if (resolveAudioChunkRef.current) {
            resolveAudioChunkRef.current();
            resolveAudioChunkRef.current = null;
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            updatePartial('');
            isStoppedRef.current = false;
            audioBufferQueueRef.current = [];

            // 1. Get credentials
            const credentials = await getCredentials();

            // 2. Create Transcribe client
            const client = new TranscribeStreamingClient({
                region,
                credentials: {
                    accessKeyId: credentials.accessKeyId,
                    secretAccessKey: credentials.secretAccessKey,
                    sessionToken: credentials.sessionToken,
                },
            });
            clientRef.current = client;

            // 3. Capture microphone audio using Web Audio API
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });
            mediaStreamRef.current = mediaStream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
            });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(mediaStream);
            sourceRef.current = source;

            // ScriptProcessorNode: 4096 buffer size, 1 input channel, 1 output channel
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (event) => {
                if (isStoppedRef.current) return;
                const inputData = event.inputBuffer.getChannelData(0);
                // Copy the Float32Array since the buffer is reused
                const pcmData = pcmEncode(new Float32Array(inputData));
                pushAudioChunk(pcmData);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
            setIsRecording(true);

            // Start countdown timer
            setSecondsRemaining(Math.ceil(maxDurationMs / 1000));
            countdownRef.current = setInterval(() => {
                setSecondsRemaining((prev) => {
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);

            // Auto-stop after max duration
            timeoutRef.current = setTimeout(() => {
                stopRecordingRef.current?.();
                onTimerExpiredRef.current?.();
            }, maxDurationMs);

            // 4. Create async generator for the Transcribe SDK
            const audioStream = async function* () {
                while (!isStoppedRef.current) {
                    if (audioBufferQueueRef.current.length > 0) {
                        const chunk = audioBufferQueueRef.current.shift();
                        yield { AudioEvent: { AudioChunk: chunk } };
                    } else {
                        // Wait for the next chunk
                        await new Promise((resolve) => {
                            resolveAudioChunkRef.current = resolve;
                            // Timeout to check isStoppedRef periodically
                            setTimeout(resolve, 100);
                        });
                    }
                }
                // Drain remaining chunks
                while (audioBufferQueueRef.current.length > 0) {
                    const chunk = audioBufferQueueRef.current.shift();
                    yield { AudioEvent: { AudioChunk: chunk } };
                }
            };

            // 5. Start the Transcribe stream
            const command = new StartStreamTranscriptionCommand({
                IdentifyLanguage: true,
                LanguageOptions: languageOptions || 'en-US,es-US',
                MediaEncoding: 'pcm',
                MediaSampleRateHertz: 16000,
                AudioStream: audioStream(),
                EnablePartialResultsStabilization: true,
                PartialResultsStability: 'medium',
            });

            const response = await client.send(command);

            // 6. Process results
            streamLoop: for await (const event of response.TranscriptResultStream) {
                if (isStoppedRef.current) break;
                const results = event?.TranscriptEvent?.Transcript?.Results;
                if (!results || results.length === 0) continue;

                for (const result of results) {
                    const transcript = result.Alternatives?.[0]?.Transcript || '';
                    
                    const prospectiveText = finalTranscriptRef.current
                        ? finalTranscriptRef.current + ' ' + transcript
                        : transcript;
                    
                    const normalizeForCommand = (text) =>
                        text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
                    
                    const normalizedProspective = normalizeForCommand(prospectiveText);

                    if (normalizedProspective.includes('next question')) {
                        const commandRegex = /(?:\s+)?next[\s.,!?;:]*question[\s.,!?;:]*/i;
                        const withoutCommand = prospectiveText.replace(commandRegex, '').trim();
                        updateFinal(withoutCommand);
                        updatePartial('');
                        isStoppedRef.current = true;
                        onVoiceCommand?.('NEXT_QUESTION', withoutCommand);
                        break streamLoop;
                    }

                    if (result.IsPartial) {
                        updatePartial(transcript);
                    } else {
                        appendFinal(transcript);
                        updatePartial('');
                    }
                }
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setError('Microphone access denied. Please allow permissions and try again.');
            } else {
                setError(`Transcription error: ${err.message}`);
            }
        } finally {
            // Clean up all resources (idempotent — safe if stopRecording already ran)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
            processorRef.current?.disconnect();
            processorRef.current = null;
            sourceRef.current?.disconnect();
            sourceRef.current = null;
            audioContextRef.current?.close();
            audioContextRef.current = null;
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
            clientRef.current?.destroy();
            clientRef.current = null;
            setIsRecording(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [region, languageOptions, getCredentials, pushAudioChunk, maxDurationMs, onVoiceCommand, onTimerExpired]);

    const stopRecording = useCallback(() => {
        isStoppedRef.current = true;

        // Clear the auto-stop timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Clear countdown interval
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        // Wake the async generator so it can exit
        if (resolveAudioChunkRef.current) {
            resolveAudioChunkRef.current();
            resolveAudioChunkRef.current = null;
        }

        // Stop Web Audio nodes
        processorRef.current?.disconnect();
        processorRef.current = null;
        sourceRef.current?.disconnect();
        sourceRef.current = null;
        audioContextRef.current?.close();
        audioContextRef.current = null;

        // Stop microphone tracks
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        // Destroy Transcribe client
        clientRef.current?.destroy();
        clientRef.current = null;

        setIsRecording(false);

        // Promote any remaining partial to final
        let finalOutput = finalTranscriptRef.current;
        const remainingPartial = partialTranscriptRef.current;
        if (remainingPartial) {
            finalOutput = (finalOutput ? finalOutput + ' ' : '') + remainingPartial;
            setFinalTranscript(finalOutput);
            finalTranscriptRef.current = finalOutput;
        }
        updatePartial('');

        return finalOutput;
    }, [updatePartial]);

    // Keep refs in sync so the timeout can always call the latest functions
    stopRecordingRef.current = stopRecording;
    onTimerExpiredRef.current = onTimerExpired;

    const resetTranscript = useCallback(() => {
        updatePartial('');
        updateFinal('');
        setError(null);
        setSecondsRemaining(Math.ceil(maxDurationMs / 1000));
    }, [updatePartial, updateFinal, maxDurationMs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isStoppedRef.current = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            processorRef.current?.disconnect();
            sourceRef.current?.disconnect();
            audioContextRef.current?.close();
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            clientRef.current?.destroy();
        };
    }, []);

    return {
        partialTranscript,
        finalTranscript,
        isRecording,
        error,
        secondsRemaining,
        startRecording,
        stopRecording,
        resetTranscript,
    };
}
