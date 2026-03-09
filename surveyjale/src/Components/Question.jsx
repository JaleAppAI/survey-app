import { useState, useRef } from 'react';
import './Question.css';
import { Mic, Square, Loader } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';

let client;
function getClient() {
  if (!client) client = generateClient();
  return client;
}

function Question({
  questionNumber = 1,
  questionText = "What is your response?",
  value,
  onChange,
  hasError = false
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
          const { data } = await getClient().mutations.transcribeAudio({ audio: base64 });
          if (data) {
            onChange(value ? `${value} ${data}` : data);
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
    <div className={`question-container form-card-shadow${hasError ? ' question-container--error' : ''}`}>
      <h2>
        <span className="question-number">{questionNumber}</span>
        {questionText}
        <span className="text-required"> *</span>
      </h2>
      <div className="question-content-wrapper">
        <div className="question-textarea-wrapper">
          <textarea
            className={`question-textarea${hasError ? ' question-textarea--error' : ''}`}
            placeholder="Type your response here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {hasError && <p className="question-error-msg">This field is required.</p>}
        </div>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`question-record-btn${recording ? ' recording' : ''}`}
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