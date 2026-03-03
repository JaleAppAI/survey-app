import { AssemblyAI } from 'assemblyai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio } = req.body ?? {};

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'audio field required (base64 string)' });
  }
  if (audio.length > 15 * 1024 * 1024) {
    return res.status(413).json({ error: 'Audio file too large' });
  }

  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audio, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 audio data' });
  }

  let uploadUrl;
  try {
    uploadUrl = await client.files.upload(audioBuffer);
  } catch (err) {
    console.error('[transcribe] upload failed:', err.message);
    return res.status(500).json({ error: 'Audio upload failed' });
  }

  let transcript;
  try {
    transcript = await client.transcripts.transcribe({ audio: uploadUrl });
  } catch (err) {
    console.error('[transcribe] transcription failed:', err.message);
    return res.status(500).json({ error: 'Transcription failed' });
  }

  if (transcript.status === 'error') {
    console.error('[transcribe] AssemblyAI error:', transcript.error);
    return res.status(500).json({ error: 'Transcription service error' });
  }

  return res.status(200).json({ transcript: transcript.text ?? '' });
}
