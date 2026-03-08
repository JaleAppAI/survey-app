import { useState } from 'react';
import './UserInfoStep.css';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function UserInfoStep({ onComplete }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const emailInvalid = emailTouched && email && !isValidEmail(email);
  const canContinue = email.trim() !== '' && isValidEmail(email);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canContinue) return;
    onComplete(name.trim(), email.trim());
  };

  return (
    <div className="user-info-step">
      <div className="user-info-card">
        <h2 className="user-info-title">Before we begin</h2>
        <p className="user-info-subtitle">Please enter your details to continue.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="user-info-field">
            <label className="user-info-label" htmlFor="respondent-name">
              Name <span className="user-info-optional">(optional)</span>
            </label>
            <input
              id="respondent-name"
              className="user-info-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              required
            />
            {emailInvalid && (
              <p className="user-info-error">Please enter a valid email address.</p>
            )}
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
