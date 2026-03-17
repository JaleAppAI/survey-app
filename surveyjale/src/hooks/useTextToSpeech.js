import { useState, useCallback, useRef, useEffect } from 'react';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { getUrl } from 'aws-amplify/storage';

/**
 * Custom hook for text-to-speech with S3 cache and Amazon Polly fallback.
 *
 * Playback priority:
 * 1. In-memory blob cache (keyed by audioKey) — no network call
 * 2. S3 pre-generated audio (via audioKey) — single fetch
 * 3. Runtime Polly synthesis — fallback for old/failed questions
 *
 * @param {Object} options
 * @param {string} [options.region='us-east-1'] - AWS region
 * @param {() => Promise<{accessKeyId, secretAccessKey, sessionToken}>} options.getCredentials
 * @param {string} [options.voiceId='Ruth'] - Polly voice ID
 * @returns {{ speak: (text: string, audioKey?: string) => void, stop: () => void, isSpeaking: boolean }}
 */
export function useTextToSpeech({ region = 'us-east-2', getCredentials, voiceId = 'Ruth' } = {}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef(null);
    const objectUrlRef = useRef(null);
    const speakTimeoutRef = useRef(null);
    const speakIdRef = useRef(0);
    const blobCacheRef = useRef(new Map());
    const pollyClientRef = useRef(null);
    const pollyClientKeyRef = useRef(null);

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
        speakIdRef.current += 1; // Invalidate any in-flight requests
        if (speakTimeoutRef.current) {
            clearTimeout(speakTimeoutRef.current);
            speakTimeoutRef.current = null;
        }
        cleanup();
        setIsSpeaking(false);
    }, [cleanup]);

    /** Play a blob URL, wiring up onended/onerror handlers */
    const playBlobUrl = useCallback((url, currentSpeakId) => {
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

        return audio.play().catch(() => {
            if (speakIdRef.current === currentSpeakId) {
                setIsSpeaking(false);
                cleanup();
            }
        });
    }, [cleanup]);

    const speak = useCallback((text, audioKey) => {
        if (!text) return;

        // Cancel any ongoing speech and pending speak calls
        stop();

        const currentSpeakId = ++speakIdRef.current;

        // Small delay so blur events don't immediately cancel us
        speakTimeoutRef.current = setTimeout(async () => {
            try {
                setIsSpeaking(true);

                // Path 1: In-memory blob cache hit
                if (audioKey && blobCacheRef.current.has(audioKey)) {
                    if (speakIdRef.current !== currentSpeakId) return;
                    const cachedUrl = blobCacheRef.current.get(audioKey);
                    await playBlobUrl(cachedUrl, currentSpeakId);
                    speakTimeoutRef.current = null;
                    return;
                }

                // Path 2: S3 pre-generated audio
                if (audioKey) {
                    try {
                        const { url } = await getUrl({ path: audioKey });
                        if (speakIdRef.current !== currentSpeakId) return;

                        // Fetch the audio to create a blob URL (works on all browsers including Safari)
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`S3 fetch failed: ${response.status}`);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        // Cache for repeat plays
                        blobCacheRef.current.set(audioKey, blobUrl);

                        if (speakIdRef.current !== currentSpeakId) {
                            URL.revokeObjectURL(blobUrl);
                            return;
                        }

                        await playBlobUrl(blobUrl, currentSpeakId);
                        speakTimeoutRef.current = null;
                        return;
                    } catch (s3Err) {
                        console.warn('[useTextToSpeech] S3 cache miss, falling back to Polly:', s3Err);
                        if (speakIdRef.current !== currentSpeakId) return;
                        // Fall through to Polly
                    }
                }

                // Path 3: Runtime Polly synthesis (fallback)
                if (!getCredentials) {
                    setIsSpeaking(false);
                    return;
                }

                const credentials = await getCredentials();
                if (speakIdRef.current !== currentSpeakId) return;

                // Reuse cached PollyClient if region and credentials haven't changed
                const clientKey = `${region}:${credentials.accessKeyId}:${credentials.sessionToken}`;
                if (pollyClientRef.current && pollyClientKeyRef.current === clientKey) {
                    // reuse existing client
                } else {
                    pollyClientRef.current = new PollyClient({
                        region,
                        credentials: {
                            accessKeyId: credentials.accessKeyId,
                            secretAccessKey: credentials.secretAccessKey,
                            sessionToken: credentials.sessionToken,
                        },
                    });
                    pollyClientKeyRef.current = clientKey;
                }
                const client = pollyClientRef.current;

                const command = new SynthesizeSpeechCommand({
                    Engine: 'neural',
                    OutputFormat: 'mp3',
                    Text: text,
                    VoiceId: voiceId,
                    LanguageCode: 'en-US',
                });

                const pollyResponse = await client.send(command);
                if (speakIdRef.current !== currentSpeakId) return;

                const blob = new Blob(
                    [await pollyResponse.AudioStream.transformToByteArray()],
                    { type: 'audio/mpeg' }
                );
                const url = URL.createObjectURL(blob);
                await playBlobUrl(url, currentSpeakId);
            } catch (err) {
                console.error('[useTextToSpeech] error:', err);
                setIsSpeaking(false);
                cleanup();
            }
            speakTimeoutRef.current = null;
        }, 80);
    }, [region, getCredentials, voiceId, cleanup, stop, playBlobUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
            cleanup();
        };
    }, [cleanup]);

    return { speak, stop, isSpeaking };
}
