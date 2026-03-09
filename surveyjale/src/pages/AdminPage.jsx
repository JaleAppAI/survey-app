import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";
import "./AdminPage.css";

const client = generateClient();

function exportCSV(submissions, questions) {
  const headers = ["Name", "Email", "Submitted At", ...questions.map(q => q.text)];
  const rows = submissions.map(s => {
    let parsed = [];
    try { parsed = JSON.parse(s.responses); } catch (e) { /* empty */ }
    const byQuestion = {};
    parsed.forEach(r => { byQuestion[r.questionText] = r.responseText; });
    const esc = v => '"' + (v || "").replace(/"/g, '""') + '"';
    return [
      esc(s.respondentName),
      esc(s.respondentEmail),
      esc(s.createdAt),
      ...questions.map(q => esc(byQuestion[q.text])),
    ];
  });
  const csv = [headers.map(h => '"' + h + '"'), ...rows].map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "survey-submissions.csv";
  a.click();
}

function LoginForm({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn({ username: email, password });
      onSignedIn();
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-wrapper">
      <div className="admin-auth-card">
        <h1 className="admin-auth-title">Admin Sign In</h1>
        <p className="admin-auth-subtitle">Sign in to view survey submissions.</p>
        <form onSubmit={handleLogin} noValidate>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="admin-input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              className="admin-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SubmissionRow({ submission, questions }) {
  const [expanded, setExpanded] = useState(false);
  let parsed = [];
  try { parsed = JSON.parse(submission.responses); } catch (e) { /* empty */ }
  const byQuestion = {};
  parsed.forEach(r => { byQuestion[r.questionText] = r.responseText; });

  return (
    <>
      <tr
        className={"admin-tr" + (expanded ? " admin-tr--expanded" : "")}
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: "pointer" }}
      >
        <td className="admin-td">{submission.respondentName || "-"}</td>
        <td className="admin-td">{submission.respondentEmail}</td>
        <td className="admin-td">{new Date(submission.createdAt).toLocaleString()}</td>
        <td className="admin-td admin-td--toggle">{expanded ? "▲" : "▼"}</td>
      </tr>
      {expanded && (
        <tr className="admin-tr-detail">
          <td className="admin-td-detail" colSpan={4}>
            <div className="admin-responses">
              {questions.map((q, i) => (
                <div key={i} className="admin-response-item">
                  <p className="admin-response-q">{i + 1}. {q.text}</p>
                  <p className="admin-response-a">{byQuestion[q.text] || "No response"}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminPage() {
  const surveyId = new URLSearchParams(window.location.search).get("survey");
  const [authState, setAuthState] = useState("loading");
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(surveyId || "");

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        setAuthState("authenticated");
        loadData(selectedSurvey);
      } else {
        setAuthState("unauthenticated");
      }
    } catch (e) {
      setAuthState("unauthenticated");
    }
  }

  async function loadData(sid) {
    if (!sid) {
      setDataLoading(true);
      try {
        const { data } = await client.models.Survey.list();
        setSurveys(data);
      } catch (err) {
        console.error("Failed to load surveys:", err);
      } finally {
        setDataLoading(false);
      }
      return;
    }
    setDataLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        client.models.Question.list({ filter: { surveyId: { eq: sid } } }),
        client.models.Submission.list({ filter: { surveyId: { eq: sid } } }),
      ]);
      const sortedQ = [...qRes.data].sort((a, b) => a.order - b.order);
      const sortedS = [...sRes.data].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setQuestions(sortedQ);
      setSubmissions(sortedS);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setDataLoading(false);
    }
  }

  const handleSignedIn = () => {
    setAuthState("authenticated");
    loadData(selectedSurvey);
  };

  const handleSignOut = async () => {
    await signOut();
    setAuthState("unauthenticated");
  };

  const handleSurveySelect = (sid) => {
    setSelectedSurvey(sid);
    loadData(sid);
  };

  if (authState === "loading") return <div className="admin-loading">Loading...</div>;
  if (authState === "unauthenticated") return <LoginForm onSignedIn={handleSignedIn} />;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-page-title">Survey Admin</h1>
        <button className="admin-signout-btn" onClick={handleSignOut}>Sign Out</button>
      </div>

      {!selectedSurvey && (
        <div className="admin-section">
          {dataLoading ? (
            <p className="admin-hint">Loading surveys...</p>
          ) : surveys.length === 0 ? (
            <p className="admin-hint">No surveys found. Add ?survey=id to the URL.</p>
          ) : (
            <>
              <p className="admin-hint">Select a survey:</p>
              <ul className="admin-survey-list">
                {surveys.map(s => (
                  <li key={s.id}>
                    <button className="admin-survey-btn" onClick={() => handleSurveySelect(s.id)}>
                      {s.title || s.id}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {selectedSurvey && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <p className="admin-meta">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </p>
            <button
              className="admin-export-btn"
              onClick={() => exportCSV(submissions, questions)}
              disabled={submissions.length === 0}
            >
              Export CSV
            </button>
          </div>
          {dataLoading ? (
            <p className="admin-hint">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="admin-hint">No submissions yet for this survey.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Name</th>
                    <th className="admin-th">Email</th>
                    <th className="admin-th">Submitted At</th>
                    <th className="admin-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => (
                    <SubmissionRow key={sub.id} submission={sub} questions={questions} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
