import { useState, useCallback, useRef, useEffect } from 'react';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

/**
 * Custom hook for text-to-speech using Amazon Polly neural voices.
 *
 * @param {Object} options
 * @param {string} [options.region='us-east-2'] - AWS region
 * @param {() => Promise<{accessKeyId, secretAccessKey, sessionToken}>} options.getCredentials
 * @param {string} [options.voiceId='Ruth'] - Polly voice ID
 * @returns {{ speak: (text: string) => void, stop: () => void, isSpeaking: boolean }}
 */
export function useTextToSpeech({ region = 'us-east-1', getCredentials, voiceId = 'Ruth' } = {}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef(null);
    const objectUrlRef = useRef(null);
    const speakTimeoutRef = useRef(null);

    const cleanup = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current = null;
        }
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    const stop = useCallback(() => {
        if (speakTimeoutRef.current) {
            clearTimeout(speakTimeoutRef.current);
            speakTimeoutRef.current = null;
        }
        cleanup();
        setIsSpeaking(false);
    }, [cleanup]);

    const speak = useCallback((text) => {
        if (!text || !getCredentials) return;

        // Cancel any ongoing speech and pending speak calls
        if (speakTimeoutRef.current) {
            clearTimeout(speakTimeoutRef.current);
        }
        cleanup();

        // Small delay so blur events don't immediately cancel us
        speakTimeoutRef.current = setTimeout(async () => {
            try {
                setIsSpeaking(true);

                const credentials = await getCredentials();
                const client = new PollyClient({
                    region,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey,
                        sessionToken: credentials.sessionToken,
                    },
                });

                const command = new SynthesizeSpeechCommand({
                    Engine: 'neural',
                    OutputFormat: 'mp3',
                    Text: text,
                    VoiceId: voiceId,
                    LanguageCode: 'en-US',
                });

                const response = await client.send(command);

                // Convert the audio stream to a Blob and play it
                const blob = new Blob(
                    [await response.AudioStream.transformToByteArray()],
                    { type: 'audio/mpeg' }
                );
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;

                const audio = new Audio(url);
                audioRef.current = audio;

                audio.onended = () => {
                    setIsSpeaking(false);
                    cleanup();
                };
                audio.onerror = () => {
                    setIsSpeaking(false);
                    cleanup();
                };

                await audio.play();
            } catch (err) {
                console.error('[useTextToSpeech] Polly error:', err);
                setIsSpeaking(false);
                cleanup();
            }
            speakTimeoutRef.current = null;
        }, 80);
    }, [region, getCredentials, voiceId, cleanup]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
            cleanup();
        };
    }, [cleanup]);

    return { speak, stop, isSpeaking };
}

