import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { uploadData, remove } from 'aws-amplify/storage';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import './AdminPage.css';

const client = generateClient({ authMode: 'userPool' });

const styles = {
  page: {
    minHeight: '100vh',
    fontFamily: 'Syne, sans-serif',
    backgroundColor: '#D4DCE6',
    backgroundImage: 'radial-gradient(circle, #a8b5c5 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
  signOutBtn: {
    background: '#fff',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    padding: '7px 16px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    color: '#64748b',
  },
  content: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '32px 16px',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  contentTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#181855',
  },
  card: {
    background: '#fff',
    border: '1px solid #dde3ed',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    color: '#1e293b',
    background: '#fff',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    color: '#1e293b',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    background: '#0179FF',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    fontWeight: 600,
  },
  exportBtn: {
    background: '#0179FF',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 18px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    fontWeight: 600,
  },
  errorText: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #dde3ed',
    color: '#374151',
    fontWeight: 600,
    fontSize: '13px',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f4f9',
    color: '#1e293b',
    verticalAlign: 'top',
  },
  expandBtn: {
    background: 'none',
    border: '1px solid #dde3ed',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontSize: '13px',
    color: '#64748b',
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: '600px',
    maxWidth: 'calc(100vw - 32px)',
    zIndex: 1001,
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
    fontFamily: 'Syne, sans-serif',
    animation: 'fadeScale 200ms ease-out',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 48px)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e8edf5',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    flexShrink: 0,
  },
  modalName: {
    margin: '0 0 14px',
    fontSize: '17px',
    fontWeight: 700,
    color: '#181855',
  },
  modalInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  modalInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  modalInfoLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  modalInfoValue: {
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: 500,
    wordBreak: 'break-all',
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  modalClose: {
    background: 'none',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalFooter: {
    padding: '12px 24px',
    borderTop: '1px solid #e8edf5',
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  qaBlock: {
    marginBottom: '16px',
  },
  qaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '8px',
  },
  qaNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#0179FF',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '1px',
  },
  qaQuestionText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#181855',
    lineHeight: 1.5,
  },
  qaAnswer: {
    background: '#f8fafc',
    border: '1px solid #e8edf5',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.6,
    marginLeft: '32px',
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  tableTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#181855',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  shareSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f4f9',
  },
  shareSectionLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '10px',
  },
  shareRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  shareInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '13px',
    color: '#64748b',
    background: '#f8fafc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  copyBtn: {
    flexShrink: 0,
    padding: '8px 14px',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    fontFamily: 'Syne, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#fff',
    color: '#374151',
    whiteSpace: 'nowrap',
  },
  copyBtnSuccess: {
    background: '#E8FAF6',
    color: '#1AA88C',
    border: '1px solid #A3E8DA',
  },
  createBtn: {
    background: '#0179FF',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '7px 16px',
    cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '8px',
  },
  fileInput: {
    display: 'block',
    width: '100%',
    padding: '8px 0',
    fontFamily: 'Syne, sans-serif',
    fontSize: '14px',
    color: '#374151',
  },
  csvErrorList: {
    margin: '8px 0 0',
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    listStyle: 'none',
    fontSize: '13px',
    color: '#dc2626',
  },
  csvSuccess: {
    margin: '8px 0 0',
    padding: '8px 12px',
    background: '#E8FAF6',
    border: '1px solid #A3E8DA',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1AA88C',
    fontWeight: 600,
  },
  successState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    gap: '12px',
  },
  successIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#E8FAF6',
    border: '2px solid #A3E8DA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  spinnerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    gap: '16px',
    color: '#64748b',
    fontSize: '14px',
  },
};

/** Strip leading characters that could be interpreted as formulas in spreadsheet apps */
function sanitizeCell(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^[=+\-@\t\r]+/, '');
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const questions = [];
  const errors = [];
  const seenOrders = new Set();

  // Skip header row if first cell is non-numeric
  const startIdx = isNaN(Number(lines[0]?.split(',')[0])) ? 1 : 0;

  lines.slice(startIdx).forEach((line, i) => {
    const rowNum = startIdx + i + 1;
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) { errors.push(`Row ${rowNum}: missing comma separator`); return; }
    const rawOrder = line.slice(0, commaIdx).trim();
    let rawText = line.slice(commaIdx + 1).trim();
    // Handle quoted fields: strip surrounding quotes and unescape ""
    if (rawText.startsWith('"') && rawText.endsWith('"')) {
      rawText = rawText.slice(1, -1).replace(/""/g, '"');
    }
    const text = sanitizeCell(rawText);
    const order    = Number(rawOrder);

    if (!Number.isInteger(order) || order < 1) {
      errors.push(`Row ${rowNum}: order must be a positive integer (got "${rawOrder}")`);
    } else if (seenOrders.has(order)) {
      errors.push(`Row ${rowNum}: duplicate order value ${order}`);
    } else {
      seenOrders.add(order);
    }
    if (!text) errors.push(`Row ${rowNum}: question text is empty`);
    if (!errors.find(e => e.startsWith(`Row ${rowNum}`))) {
      questions.push({ order, text });
    }
  });

  return { questions, errors };
}

// Login form shown when not authenticated
function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn({ username: email, password });
      onSuccess();
    } catch (err) {
      setError('Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700, color: '#181855' }}>
          Admin Sign In
        </h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" style={{ ...styles.primaryBtn, width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Modal shown when clicking View on a submission row
function SubmissionModal({ submission, onClose }) {
  let responses = [];
  try {
    responses = JSON.parse(submission.responses);
  } catch {
    responses = [];
  }

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  return createPortal(
    <>
      <style>{`@keyframes fadeScale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }`}</style>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.modalName}>{submission.respondentName || '—'}</p>
            <div style={styles.modalInfoGrid}>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>Email</span>
                <span style={styles.modalInfoValue}>{submission.respondentEmail || '—'}</span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>Industry</span>
                <span style={styles.modalInfoValue}>{submission.respondentIndustry || '—'}</span>
              </div>
              <div style={styles.modalInfoItem}>
                <span style={styles.modalInfoLabel}>Submitted</span>
                <span style={styles.modalInfoValue}>{formatDate(submission.createdAt)}</span>
              </div>
            </div>
          </div>
          <button style={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={styles.modalBody}>
          {responses.length === 0 ? (
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>No responses found.</p>
          ) : (
            responses.map((r, i) => (
              <div key={i} style={styles.qaBlock}>
                <div style={styles.qaRow}>
                  <span style={styles.qaNumber}>{i + 1}</span>
                  <span style={styles.qaQuestionText}>{r.questionText}</span>
                </div>
                <div style={styles.qaAnswer}>{r.responseText || <em style={{ color: '#94a3b8' }}>No answer</em>}</div>
              </div>
            ))
          )}
        </div>
        <div style={styles.modalFooter}>
          <button style={{ ...styles.expandBtn, padding: '7px 20px' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </>,
    document.body
  );
}

// Modal for creating a new survey via CSV upload
function CreateSurveyModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [csvQuestions, setCsvQuestions] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [creating, setCreating] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState('');
  const [createError, setCreateError] = useState('');
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [createdName, setCreatedName] = useState('');

  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    // File size check (5 MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setCsvErrors(['File exceeds 5 MB limit.']);
      setCsvQuestions([]);
      return;
    }

    // MIME type check
    if (file.type && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setCsvErrors(['Invalid file type. Please upload a .csv file.']);
      setCsvQuestions([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const { questions, errors } = parseCSV(ev.target.result);
      setCsvQuestions(questions);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError('');
    setCreatingStatus('Creating questions…');
    try {
      const { data: survey, errors: surveyErrors } = await client.models.Survey.create({ name: name.trim() });
      if (surveyErrors || !survey) throw new Error(surveyErrors?.[0]?.message || 'Failed to create survey');
      const sorted = [...csvQuestions].sort((a, b) => a.order - b.order);
      const createdQuestions = [];
      for (const q of sorted) {
        const { data: question, errors: qErrors } = await client.models.Question.create({ text: q.text, order: q.order, surveyId: survey.id });
        if (qErrors) throw new Error(qErrors[0]?.message || `Failed to create question: ${q.text}`);
        createdQuestions.push(question);
      }

      // Generate audio for each question and upload to S3
      setCreatingStatus('Generating audio…');
      try {
        const { credentials } = await fetchAuthSession();
        const polly = new PollyClient({
          region: 'us-east-1',
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        for (let i = 0; i < createdQuestions.length; i++) {
          const q = createdQuestions[i];
          setCreatingStatus(`Generating audio… (${i + 1}/${createdQuestions.length})`);
          try {
            const response = await polly.send(new SynthesizeSpeechCommand({
              Engine: 'generative',
              OutputFormat: 'mp3',
              Text: q.text,
              VoiceId: 'Ruth',
              LanguageCode: 'en-US',
            }));
            const audioBytes = await response.AudioStream.transformToByteArray();
            const audioKey = `audio/${survey.id}/${q.id}.mp3`;
            await uploadData({
              path: audioKey,
              data: new Blob([audioBytes], { type: 'audio/mpeg' }),
              options: { contentType: 'audio/mpeg' },
            }).result;
            await client.models.Question.update({ id: q.id, audioKey });
          } catch (audioErr) {
            console.warn(`[CreateSurvey] Audio generation failed for question ${q.id}:`, audioErr);
            // Non-blocking — survey still works via runtime Polly fallback
          }
        }
      } catch (audioSetupErr) {
        console.warn('[CreateSurvey] Audio generation setup failed:', audioSetupErr);
      }

      const link = `${window.location.origin}/?survey=${survey.id}`;
      setCreatedName(name.trim());
      setCreatedLink(link);
      onCreate(survey);
    } catch (err) {
      console.error('Failed to create survey', err);
      setCreateError(err.message || 'Failed to create survey. Please try again.');
    } finally {
      setCreating(false);
      setCreatingStatus('');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canCreate = name.trim() && csvQuestions.length > 0 && csvErrors.length === 0;

  return createPortal(
    <>
      <style>{`@keyframes fadeScale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }`}</style>
      <div style={styles.modalBackdrop} onClick={creating ? undefined : onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#181855' }}>
            {createdLink ? 'Survey Created' : 'Create Survey'}
          </h2>
          {!creating && (
            <button style={styles.modalClose} onClick={onClose}>×</button>
          )}
        </div>

        {creating ? (
          <div style={styles.spinnerWrap}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #e2e8f0',
              borderTop: '3px solid #2563eb', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            {creatingStatus || 'Creating survey…'}
          </div>
        ) : createdLink ? (
          <div style={styles.successState}>
            <div style={styles.successIcon}>✓</div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#181855' }}>{createdName}</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Survey created with {csvQuestions.length} question{csvQuestions.length !== 1 ? 's' : ''}.
            </p>
            <div style={{ width: '100%', marginTop: '8px' }}>
              <div style={{ ...styles.shareSectionLabel, marginBottom: '8px' }}>Share Link</div>
              <div style={styles.shareRow}>
                <div style={styles.shareInput}>{createdLink}</div>
                <button
                  style={copied ? { ...styles.copyBtn, ...styles.copyBtnSuccess } : styles.copyBtn}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.modalBody}>
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Survey Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={styles.input}
                placeholder="e.g. Customer Feedback Q1 2026"
                autoFocus
              />
            </div>
            <div>
              <label style={styles.label}>Questions CSV</label>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>
                Two columns: <code>order</code> (positive integer), <code>question_text</code>. Header row optional.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVFile}
                style={styles.fileInput}
              />
              {csvErrors.length > 0 && (
                <ul style={styles.csvErrorList}>
                  {csvErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {csvErrors.length === 0 && csvQuestions.length > 0 && (
                <div style={styles.csvSuccess}>
                  ✓ {csvQuestions.length} question{csvQuestions.length !== 1 ? 's' : ''} ready
                </div>
              )}
            </div>
            {createError && (
              <div style={{ ...styles.csvErrorList, marginTop: '16px' }}>
                {createError}
              </div>
            )}
          </div>
        )}

        <div style={styles.modalFooter}>
          {createdLink ? (
            <button style={{ ...styles.expandBtn, padding: '7px 20px' }} onClick={onClose}>Close</button>
          ) : (
            <>
              <button style={{ ...styles.expandBtn, padding: '7px 20px', marginRight: '8px' }} onClick={onClose} disabled={creating}>
                Cancel
              </button>
              <button
                style={{ ...styles.primaryBtn, opacity: canCreate ? 1 : 0.5, cursor: canCreate ? 'pointer' : 'not-allowed' }}
                onClick={handleCreate}
                disabled={!canCreate || creating}
              >
                Create
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// Submission row with modal trigger
function SubmissionRow({ submission }) {
  const [showModal, setShowModal] = useState(false);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  return (
    <>
      <tr>
        <td style={styles.td}>{submission.respondentName || '—'}</td>
        <td style={styles.td} className="col-email">{submission.respondentEmail}</td>
        <td style={styles.td} className="col-industry">{submission.respondentIndustry || '—'}</td>
        <td style={styles.td}>{formatDate(submission.createdAt)}</td>
        <td style={styles.td}>
          <button style={styles.expandBtn} className="admin-view-btn" onClick={() => setShowModal(true)}>
            ▶ View
          </button>
        </td>
      </tr>
      {showModal && <SubmissionModal submission={submission} onClose={() => setShowModal(false)} />}
    </>
  );
}

function exportCSV(submissions) {
  if (submissions.length === 0) return;

  const escape = (val) => {
    if (val == null) return '';
    const sanitized = sanitizeCell(String(val));
    const str = sanitized.replace(/"/g, '""');
    return `"${str}"`;
  };

  // Collect all unique question texts in order
  const allQuestions = [];
  const seenQuestions = new Set();
  for (const sub of submissions) {
    let responses = [];
    try { responses = JSON.parse(sub.responses); } catch { /* ignore */ }
    for (const r of responses) {
      if (!seenQuestions.has(r.questionText)) {
        seenQuestions.add(r.questionText);
        allQuestions.push(r.questionText);
      }
    }
  }

  const headers = ['Name', 'Email', 'Industry', 'Submitted At', ...allQuestions];
  const rows = submissions.map(sub => {
    let responses = [];
    try { responses = JSON.parse(sub.responses); } catch { /* ignore */ }
    const responseMap = {};
    for (const r of responses) {
      responseMap[r.questionText] = r.responseText;
    }
    return [
      sub.respondentName || '',
      sub.respondentEmail,
      sub.respondentIndustry || '',
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      ...allQuestions.map(q => responseMap[q] || ''),
    ].map(escape).join(',');
  });

  const csv = [headers.map(escape).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'submissions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Modal for confirming survey deletion
function DeleteSurveyModal({ surveyName, onConfirm, onClose, deleting }) {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText === surveyName;

  return createPortal(
    <>
      <style>{`@keyframes fadeScale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }`}</style>
      <div style={styles.modalBackdrop} onClick={deleting ? undefined : onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#181855' }}>
            Delete Survey
          </h2>
          {!deleting && (
            <button style={styles.modalClose} onClick={onClose}>×</button>
          )}
        </div>

        {deleting ? (
          <div style={styles.spinnerWrap}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #e2e8f0',
              borderTop: '3px solid #dc2626', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Deleting survey…
          </div>
        ) : (
          <div style={styles.modalBody}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
              This will permanently delete <strong>{surveyName}</strong>, including
              all questions, submissions, and audio files. This cannot be undone.
            </p>
            <label style={styles.label}>
              Type <strong>{surveyName}</strong> to confirm:
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={styles.input}
              placeholder={surveyName}
              autoFocus
            />
          </div>
        )}

        {!deleting && (
          <div style={styles.modalFooter}>
            <button
              style={{ ...styles.expandBtn, padding: '7px 20px', marginRight: '8px' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canDelete}
              style={{
                ...styles.primaryBtn,
                background: canDelete ? '#dc2626' : '#ccc',
                cursor: canDelete ? 'pointer' : 'not-allowed',
              }}
            >
              Permanently Delete
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [surveyError, setSurveyError] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState(searchParams.get('survey') || '');
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await fetchAuthSession();
        if (session.tokens?.idToken) {
          setIsAuthenticated(true);
        } else {
          setShowLogin(true);
        }
      } catch {
        setShowLogin(true);
      }
    }
    checkAuth();
  }, []);

  async function fetchSurveys() {
    try {
      const { data } = await client.models.Survey.list();
      setSurveys(data);
    } catch (err) {
      console.error('Failed to load surveys:', err);
      setSurveyError('Failed to load surveys. Please sign out and try again.');
    }
  }

  // Fetch surveys once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSurveys();
  }, [isAuthenticated]);

  // Fetch submissions when survey selected
  useEffect(() => {
    if (!selectedSurveyId) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    async function fetchSubmissions() {
      try {
        const { data } = await client.models.Submission.list({
          filter: { surveyId: { eq: selectedSurveyId } },
        });
        const sorted = [...data].filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setSubmissions(sorted);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchSubmissions();
  }, [selectedSurveyId]);

  const respondentUrl = selectedSurveyId ? `${window.location.origin}/?survey=${selectedSurveyId}` : '';

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setIsAuthenticated(false);
    setShowLogin(true);
  };

  function handleSurveyCreated(survey) {
    setSurveys(prev => [...prev, survey]);
    setSelectedSurveyId(survey.id);
    setCopiedLink(false);
  }

  const handleDeleteSurvey = async () => {
    if (!selectedSurveyId) return;

    setDeleting(true);
    try {
      // 1. Delete all submissions for this survey
      console.log('[DeleteSurvey] Step 1: Deleting submissions for survey', selectedSurveyId);
      let nextToken = undefined;
      let deletedSubs = 0;
      do {
        const { data: subs, errors: subListErrors, nextToken: nt } = await client.models.Submission.list({
          filter: { surveyId: { eq: selectedSurveyId } },
          ...(nextToken ? { nextToken } : {}),
        });
        if (subListErrors) {
          console.error('[DeleteSurvey] Failed to list submissions:', JSON.stringify(subListErrors, null, 2));
          throw new Error(`Failed to list submissions: ${subListErrors[0]?.message}`);
        }
        console.log(`[DeleteSurvey]   Found ${subs.length} submissions in this page`);
        for (const s of subs) {
          const { errors: delErr } = await client.models.Submission.delete({ id: s.id });
          if (delErr) {
            console.error(`[DeleteSurvey]   Failed to delete submission ${s.id}:`, JSON.stringify(delErr, null, 2));
          } else {
            deletedSubs++;
          }
        }
        nextToken = nt;
      } while (nextToken);
      console.log(`[DeleteSurvey] Step 1 done: deleted ${deletedSubs} submissions`);

      // 2. Fetch all questions (need audioKey for S3 cleanup)
      console.log('[DeleteSurvey] Step 2: Fetching questions');
      const allQuestions = [];
      nextToken = undefined;
      do {
        const { data: qs, errors: qListErrors, nextToken: nt } = await client.models.Question.list({
          filter: { surveyId: { eq: selectedSurveyId } },
          ...(nextToken ? { nextToken } : {}),
        });
        if (qListErrors) {
          console.error('[DeleteSurvey] Failed to list questions:', JSON.stringify(qListErrors, null, 2));
          throw new Error(`Failed to list questions: ${qListErrors[0]?.message}`);
        }
        allQuestions.push(...qs);
        nextToken = nt;
      } while (nextToken);
      console.log(`[DeleteSurvey] Step 2 done: found ${allQuestions.length} questions`);

      // 3. Delete S3 audio files (best-effort — don't block on missing files)
      const audioQuestions = allQuestions.filter(q => q.audioKey);
      console.log(`[DeleteSurvey] Step 3: Deleting ${audioQuestions.length} S3 audio files`);
      const audioResults = await Promise.allSettled(
        audioQuestions.map(q => remove({ path: q.audioKey }))
      );
      const audioFailed = audioResults.filter(r => r.status === 'rejected');
      if (audioFailed.length > 0) {
        console.warn(`[DeleteSurvey] Step 3: ${audioFailed.length}/${audioQuestions.length} S3 deletes failed:`);
        audioFailed.forEach((r, i) => console.warn(`  audio[${i}]:`, r.reason));
      } else {
        console.log(`[DeleteSurvey] Step 3 done: all S3 audio files deleted`);
      }

      // 4. Delete all questions
      console.log(`[DeleteSurvey] Step 4: Deleting ${allQuestions.length} questions`);
      let deletedQs = 0;
      for (const q of allQuestions) {
        const { errors: qDelErr } = await client.models.Question.delete({ id: q.id });
        if (qDelErr) {
          console.error(`[DeleteSurvey]   Failed to delete question ${q.id}:`, JSON.stringify(qDelErr, null, 2));
        } else {
          deletedQs++;
        }
      }
      console.log(`[DeleteSurvey] Step 4 done: deleted ${deletedQs}/${allQuestions.length} questions`);

      // 5. Delete the survey itself
      console.log('[DeleteSurvey] Step 5: Deleting survey', selectedSurveyId);
      const { errors: surveyDelErr } = await client.models.Survey.delete({ id: selectedSurveyId });
      if (surveyDelErr) {
        console.error('[DeleteSurvey] Failed to delete survey:', JSON.stringify(surveyDelErr, null, 2));
        throw new Error(`Failed to delete survey: ${surveyDelErr[0]?.message}`);
      }
      console.log('[DeleteSurvey] Step 5 done: survey deleted');

      // 6. Refresh survey list, clear selection, close modal
      setSelectedSurveyId('');
      setSubmissions([]);
      setShowDeleteModal(false);
      await fetchSurveys();
      console.log('[DeleteSurvey] Complete — survey fully deleted');
    } catch (err) {
      console.error('[DeleteSurvey] FAILED at step above:', err);
      alert(`Failed to delete survey: ${err.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated && showLogin) {
    return (
      <LoginForm
        onSuccess={() => {
          setIsAuthenticated(true);
          setShowLogin(false);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={styles.page} className="admin-page">
      <div style={styles.content} className="admin-content">
        <div style={styles.contentHeader} className="admin-header">
          <h1 style={styles.contentTitle}>Admin Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
              + Create Survey
            </button>
            <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
          </div>
        </div>

        {/* Survey selector */}
        <div style={styles.card} className="admin-card">
          <label style={styles.label}>Select Survey</label>
          <select
            style={styles.select}
            value={selectedSurveyId}
            onChange={e => { setSelectedSurveyId(e.target.value); setCopiedLink(false); }}
          >
            <option value="">— Choose a survey —</option>
            {surveys.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedSurveyId && (
            <div style={styles.shareSection}>
              <div style={styles.shareSectionLabel}>Share Links</div>
              <div style={styles.shareRow}>
                <div style={styles.shareInput}>{respondentUrl}</div>
                <button
                  style={copiedLink ? { ...styles.copyBtn, ...styles.copyBtnSuccess } : styles.copyBtn}
                  onClick={() => handleCopy(respondentUrl)}
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="delete-survey-btn"
                >
                  Delete Survey
                </button>
              </div>
            </div>
          )}
          {surveyError && <p style={styles.errorText}>{surveyError}</p>}
        </div>

        {/* Submissions table */}
        {selectedSurveyId && (
          <div style={styles.card} className="admin-card">
            <div style={styles.tableHeaderRow}>
              <h2 style={styles.tableTitle}>
                Submissions {!loadingSubmissions && `(${submissions.length})`}
              </h2>
              {submissions.length > 0 && (
                <button style={styles.exportBtn} className="export-btn-mobile" onClick={() => exportCSV(submissions)}>
                  Export CSV
                </button>
              )}
            </div>

            {loadingSubmissions ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <div style={styles.emptyState}>No submissions yet for this survey.</div>
            ) : (
              <table style={styles.table} className="admin-table">
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th} className="col-email">Email</th>
                    <th style={styles.th} className="col-industry">Industry</th>
                    <th style={styles.th}>Submitted At</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => (
                    <SubmissionRow key={sub.id} submission={sub} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateSurveyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleSurveyCreated}
        />
      )}

      {showDeleteModal && (
        <DeleteSurveyModal
          surveyName={surveys.find(s => s.id === selectedSurveyId)?.name || ''}
          onConfirm={handleDeleteSurvey}
          onClose={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
