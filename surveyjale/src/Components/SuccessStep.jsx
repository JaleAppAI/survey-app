import { Check } from 'lucide-react';
import './SuccessStep.css';

function SuccessStep({ name }) {
  return (
    <div className="success-step">
      <div className="success-card form-card-shadow">
        <div className="success-icon-ring">
          <Check size={32} strokeWidth={2.5} />
        </div>
        <h1 className="success-title">
          {name ? `That's a wrap, ${name}!` : "That's a wrap!"}
        </h1>
        <p className="success-body">
          Thanks for your honest feedback, we're already using it to improve Jale AI.
        </p>
        <p className="success-body">
          We'd like to invite you to be a Founding Design Partner for Jale AI.
          This means you'll get early access to our automated screening tools
          and a direct line to our team to ensure the platform actually solves
          the hiring headaches you just described.
        </p>
        <p className="success-body">
          We'll be in touch soon about testing new tools built to make hiring
          faster, and more reliable.
        </p>
        <p className="success-note">You may now close this tab.</p>
      </div>
    </div>
  );
}

export default SuccessStep;
