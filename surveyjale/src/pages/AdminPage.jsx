import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

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
    color: '#1a1a2e',
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
    background: '#2563eb',
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
    background: '#2563eb',
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
    width: '520px',
    maxWidth: 'calc(100vw - 32px)',
    zIndex: 1001,
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
    fontFamily: 'Syne, sans-serif',
    animation: 'fadeScale 200ms ease-out',
  },
  modalHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #e8edf5',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalName: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  modalMeta: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  modalBody: {
    padding: '16px 24px',
    maxHeight: '380px',
    overflowY: 'auto',
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
  qaBlock: {
    marginBottom: '12px',
    paddingBottom: '12px',
  },
  qText: {
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '4px',
    fontSize: '13px',
    borderLeft: '3px solid #2563eb',
    paddingLeft: '8px',
  },
  aText: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: 1.6,
    paddingLeft: '11px',
    marginTop: '6px',
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
    color: '#1e293b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: '#94a3b8',
    fontSize: '14px',
  },
};

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
      setError(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
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

  return (
    <>
      <style>{`@keyframes fadeScale { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }`}</style>
      <div style={styles.modalBackdrop} onClick={onClose} />
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <div>
            <p style={styles.modalName}>{submission.respondentName || '—'}</p>
            <p style={styles.modalMeta}>{submission.respondentEmail} · {submission.respondentIndustry || '—'} · {formatDate(submission.createdAt)}</p>
          </div>
          <button style={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={styles.modalBody}>
          {responses.length === 0 ? (
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>No responses found.</p>
          ) : (
            responses.map((r, i) => {
              const isLast = i === responses.length - 1;
              return (
                <div key={i} style={{ ...styles.qaBlock, borderBottom: isLast ? 'none' : '1px solid #e8edf5' }}>
                  <div style={styles.qText}>Q{i + 1}: {r.questionText}</div>
                  <div style={styles.aText}>{r.responseText}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
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
        <td style={styles.td}>{submission.respondentEmail}</td>
        <td style={styles.td}>{submission.respondentIndustry || '—'}</td>
        <td style={styles.td}>{formatDate(submission.createdAt)}</td>
        <td style={styles.td}>
          <button style={styles.expandBtn} onClick={() => setShowModal(true)}>
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
    const str = String(val).replace(/"/g, '""');
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

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [surveyError, setSurveyError] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState(searchParams.get('survey') || '');
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

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

  // Fetch surveys once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchSurveys() {
      try {
        const { data } = await client.models.Survey.list();
        setSurveys(data);
      } catch (err) {
        console.error('Failed to load surveys:', err);
        setSurveyError('Failed to load surveys. Please sign out and try again.');
      }
    }
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

  const handleSignOut = async () => {
    await signOut();
    setIsAuthenticated(false);
    setShowLogin(true);
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
    <div style={styles.page}>
      <div style={styles.content}>
        <div style={styles.contentHeader}>
          <h1 style={styles.contentTitle}>Admin Dashboard</h1>
          <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
        </div>

        {/* Survey selector */}
        <div style={styles.card}>
          <label style={styles.label}>Select Survey</label>
          <select
            style={styles.select}
            value={selectedSurveyId}
            onChange={e => setSelectedSurveyId(e.target.value)}
          >
            <option value="">— Choose a survey —</option>
            {surveys.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {surveyError && <p style={styles.errorText}>{surveyError}</p>}
        </div>

        {/* Submissions table */}
        {selectedSurveyId && (
          <div style={styles.card}>
            <div style={styles.tableHeaderRow}>
              <h2 style={styles.tableTitle}>
                Submissions {!loadingSubmissions && `(${submissions.length})`}
              </h2>
              {submissions.length > 0 && (
                <button style={styles.exportBtn} onClick={() => exportCSV(submissions)}>
                  Export CSV
                </button>
              )}
            </div>

            {loadingSubmissions ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <div style={styles.emptyState}>No submissions yet for this survey.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Industry</th>
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
    </div>
  );
}
