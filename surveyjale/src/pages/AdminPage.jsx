import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { uploadData, remove } from 'aws-amplify/storage';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Eye } from 'lucide-react';
import './AdminPage.css';

const client = generateClient({ authMode: 'userPool' });

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
    const order = Number(rawOrder);

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
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validatePassword = (pw) => {
    const issues = [];
    if (pw.length < 8) issues.push('At least 8 characters');
    if (!/[A-Z]/.test(pw)) issues.push('At least one uppercase letter');
    if (!/[a-z]/.test(pw)) issues.push('At least one lowercase letter');
    if (!/[0-9]/.test(pw)) issues.push('At least one number');
    if (!/[^A-Za-z0-9]/.test(pw)) issues.push('At least one symbol');
    return issues;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn({ username: email, password });
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true);
        setLoading(false);
        return;
      }
      onSuccess();
    } catch (err) {
      setError('Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const issues = validatePassword(newPassword);
    if (issues.length > 0) {
      setError('Password requirements not met: ' + issues.join(', ') + '.');
      return;
    }
    setLoading(true);
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to set new password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (needsNewPassword) {
    return (
      <div className="admin-page admin-login-page">
        <div className="admin-card admin-login-card">
          <h2 className="admin-login-title admin-login-title--compact">
            Set New Password
          </h2>
          <p className="admin-login-subtitle">
            Your account requires a new password on first sign-in.
          </p>
          <form onSubmit={handleNewPassword}>
            <div className="admin-form-field">
              <label className="admin-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="admin-input"
                required
                autoFocus
              />
            </div>
            <div className="admin-form-field">
              <label className="admin-label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="admin-input"
                required
              />
            </div>
            <p className="admin-password-hint">
              Must be 8+ characters with uppercase, lowercase, number, and symbol.
            </p>
            {error && <p className="admin-error-text">{error}</p>}
            <button type="submit" className="admin-primary-btn admin-primary-btn--full" disabled={loading}>
              {loading ? 'Setting password...' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-login-page">
      <div className="admin-card admin-login-card">
        <h2 className="admin-login-title">
          Admin Sign In
        </h2>
        <form onSubmit={handleLogin}>
          <div className="admin-form-field">
            <label className="admin-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="admin-input"
              required
              autoFocus
            />
          </div>
          <div className="admin-form-field admin-form-field--lg">
            <label className="admin-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="admin-input"
              required
            />
          </div>
          {error && <p className="admin-error-text">{error}</p>}
          <button type="submit" className="admin-primary-btn admin-primary-btn--full" disabled={loading}>
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
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <div className="admin-modal-header-content">
            <p className="admin-modal-name">{submission.respondentName || '—'}</p>
            <div className="admin-modal-info-grid">
              <div className="admin-modal-info-item">
                <span className="admin-modal-info-label">Email</span>
                <span className="admin-modal-info-value">{submission.respondentEmail || '—'}</span>
              </div>
              <div className="admin-modal-info-item">
                <span className="admin-modal-info-label">Industry</span>
                <span className="admin-modal-info-value">{submission.respondentIndustry || '—'}</span>
              </div>
              <div className="admin-modal-info-item">
                <span className="admin-modal-info-label">Submitted</span>
                <span className="admin-modal-info-value">{formatDate(submission.createdAt)}</span>
              </div>
            </div>
          </div>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="admin-modal-body">
          {responses.length === 0 ? (
            <p className="admin-muted-text">No responses found.</p>
          ) : (
            responses.map((r, i) => (
              <div key={i} className="admin-qa-block">
                <div className="admin-qa-row">
                  <span className="admin-qa-number">{i + 1}</span>
                  <span className="admin-qa-question">{r.questionText}</span>
                </div>
                <div className="admin-qa-answer">{r.responseText || <em className="admin-muted-text">No answer</em>}</div>
              </div>
            ))
          )}
        </div>
        <div className="admin-modal-footer">
          <button className="admin-expand-btn admin-expand-btn--lg" onClick={onClose}>Close</button>
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
      <div className="admin-modal-backdrop" onClick={creating ? undefined : onClose} />
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {createdLink ? 'Survey Created' : 'Create Survey'}
          </h2>
          {!creating && (
            <button className="admin-modal-close" onClick={onClose}>×</button>
          )}
        </div>

        {creating ? (
          <div className="admin-spinner-wrap">
            <div className="admin-spinner" />
            {creatingStatus || 'Creating survey…'}
          </div>
        ) : createdLink ? (
          <div className="admin-success-state">
            <div className="admin-success-icon">✓</div>
            <p className="admin-success-name">{createdName}</p>
            <p className="admin-success-subtitle">
              Survey created with {csvQuestions.length} question{csvQuestions.length !== 1 ? 's' : ''}.
            </p>
            <div className="admin-success-share">
              <div className="admin-share-label">Share Link</div>
              <div className="admin-share-row">
                <div className="admin-share-input">{createdLink}</div>
                <button
                  className={`admin-copy-btn${copied ? ' admin-copy-btn--success' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-modal-body">
            <div className="admin-form-field admin-form-field--lg">
              <label className="admin-label">Survey Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="admin-input"
                placeholder="e.g. Customer Feedback Q1 2026"
                autoFocus
              />
            </div>
            <div>
              <label className="admin-label">Questions CSV</label>
              <p className="admin-help-text">
                Two columns: <code>order</code> (positive integer), <code>question_text</code>. Header row optional.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVFile}
                className="admin-file-input"
              />
              {csvErrors.length > 0 && (
                <ul className="admin-csv-errors">
                  {csvErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {csvErrors.length === 0 && csvQuestions.length > 0 && (
                <div className="admin-csv-success">
                  ✓ {csvQuestions.length} question{csvQuestions.length !== 1 ? 's' : ''} ready
                </div>
              )}
            </div>
            {createError && (
              <div className="admin-csv-errors admin-csv-errors--mt">
                {createError}
              </div>
            )}
          </div>
        )}

        <div className="admin-modal-footer">
          {createdLink ? (
            <button className="admin-expand-btn admin-expand-btn--lg" onClick={onClose}>Close</button>
          ) : (
            <>
              <button className="admin-expand-btn admin-expand-btn--lg admin-expand-btn--mr" onClick={onClose} disabled={creating}>
                Cancel
              </button>
              <button
                className="admin-primary-btn"
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
        <td>{submission.respondentName || '—'}</td>
        <td className="col-email">{submission.respondentEmail}</td>
        <td className="col-industry">{submission.respondentIndustry || '—'}</td>
        <td>{formatDate(submission.createdAt)}</td>
        <td>
          <button className="admin-expand-btn admin-view-btn" onClick={() => setShowModal(true)}>
            <Eye size={14} /> View
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
      <div className="admin-modal-backdrop" onClick={deleting ? undefined : onClose} />
      <div className="admin-modal-card">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            Delete Survey
          </h2>
          {!deleting && (
            <button className="admin-modal-close" onClick={onClose}>×</button>
          )}
        </div>

        {deleting ? (
          <div className="admin-spinner-wrap">
            <div className="admin-spinner admin-spinner--danger" />
            Deleting survey…
          </div>
        ) : (
          <div className="admin-modal-body">
            <p className="admin-modal-text">
              This will permanently delete <strong>{surveyName}</strong>, including
              all questions, submissions, and audio files. This cannot be undone.
            </p>
            <label className="admin-label">
              Type <strong>{surveyName}</strong> to confirm:
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="admin-input"
              placeholder={surveyName}
              autoFocus
            />
          </div>
        )}

        {!deleting && (
          <div className="admin-modal-footer">
            <button
              className="admin-expand-btn admin-expand-btn--lg admin-expand-btn--mr"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canDelete}
              className="admin-primary-btn admin-primary-btn--danger"
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
    <div className="admin-page">
      <div className="admin-content">
        <div className="admin-header">
          <h1 className="admin-content-title">Admin Dashboard</h1>
          <div className="admin-header-actions">
            <button className="admin-create-btn" onClick={() => setShowCreateModal(true)}>
              + Create Survey
            </button>
            <button className="admin-sign-out-btn" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>

        {/* Survey selector */}
        <div className="admin-card">
          <label className="admin-label">Select Survey</label>
          <select
            className="admin-select"
            value={selectedSurveyId}
            onChange={e => { setSelectedSurveyId(e.target.value); setCopiedLink(false); }}
          >
            <option value="">— Choose a survey —</option>
            {surveys.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedSurveyId && (
            <div className="admin-share-section">
              <div className="admin-share-label">Share Links</div>
              <div className="admin-share-row">
                <div className="admin-share-input">{respondentUrl}</div>
                <button
                  className={`admin-copy-btn${copiedLink ? ' admin-copy-btn--success' : ''}`}
                  onClick={() => handleCopy(respondentUrl)}
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="admin-delete-wrapper">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="delete-survey-btn"
                >
                  Delete Survey
                </button>
              </div>
            </div>
          )}
          {surveyError && <p className="admin-error-text">{surveyError}</p>}
        </div>

        {/* Submissions table */}
        {selectedSurveyId && (
          <div className="admin-card">
            <div className="admin-table-header-row">
              <h2 className="admin-table-title">
                Submissions {!loadingSubmissions && `(${submissions.length})`}
              </h2>
              {submissions.length > 0 && (
                <button className="admin-export-btn export-btn-mobile" onClick={() => exportCSV(submissions)}>
                  Export CSV
                </button>
              )}
            </div>

            {loadingSubmissions ? (
              <p className="admin-loading-text">Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <div className="admin-empty-state">No submissions yet for this survey.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="col-email">Email</th>
                    <th className="col-industry">Industry</th>
                    <th>Submitted At</th>
                    <th></th>
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
