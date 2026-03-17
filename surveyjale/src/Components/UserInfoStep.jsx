import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserInfoStep.css';

function isValidEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
}

function UserInfoStep({ onComplete }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const emailInvalid = emailTouched && email && !isValidEmail(email);
  const canContinue = name.trim() !== '' && email.trim() !== '' && isValidEmail(email) && industry.trim() !== '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    onComplete(name.trim(), email.trim(), industry.trim());
  };

  return (
    <div className="user-info-step">
      <div className="user-info-card">
        <div className="user-info-admin-link-row">
          <button
            type="button"
            className="user-info-admin-link"
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        </div>
        <h2 className="user-info-title">Before we begin</h2>
        <p className="user-info-subtitle">Please enter your details to continue.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="user-info-field">
            <label className="user-info-label" htmlFor="respondent-name">
              Name <span className="user-info-required">*</span>
            </label>
            <input
              id="respondent-name"
              className="user-info-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="user-info-field">
            <label className="user-info-label" htmlFor="respondent-email">
              Email <span className="user-info-required">*</span>
            </label>
            <input
              id="respondent-email"
              className={`user-info-input${emailInvalid ? ' user-info-input--error' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              maxLength={254}
              required
            />
            {emailInvalid && (
              <p className="user-info-error">Please enter a valid email address.</p>
            )}
          </div>
          <div className="user-info-field">
            <label className="user-info-label" htmlFor="respondent-industry">
              Industry <span className="user-info-required">*</span>
            </label>
            <input
              id="respondent-industry"
              className="user-info-input"
              type="text"
              placeholder="e.g. Healthcare, Finance, Technology"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <button
            className="user-info-btn"
            type="submit"
            disabled={!canContinue}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserInfoStep;
