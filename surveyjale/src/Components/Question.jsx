import { useState, useRef } from 'react';
import './Question.css';
import { Mic, Square, Loader } from 'lucide-react';

function Question({
  questionNumber = 1,
  questionText = "What is your response?",
  value,
  onChange
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      stream.getTracks().forEach((t) => t.stop());

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        setTranscribing(true);

        try {
          // Call your transcribe Lambda
          // (see Step 10 for how to expose this as an API endpoint)
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64 }),
          });
          const data = await res.json();
          if (data.transcript) {
            onChange(value ? `${value} ${data.transcript}` : data.transcript);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setTranscribing(false);
        }
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
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
        <button
          onClick={recording ? stopRecording : startRecording}
          className="question-record-btn"
          disabled={transcribing}
          style={{
            background: recording ? '#ef4444' : transcribing ? '#9ca3af' : '#2563eb',
          }}
        >
          {transcribing ? <Loader className="animate-spin" /> : recording ? <Square size={20} /> : <Mic />}
        </button>
      </div>
    </div>
  );
}

export default Question;