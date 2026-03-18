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
          Thank you for being so honest. We're taking your feedback especially
          what you said about your hiring bottlenecks and handing it straight to
          our engineering team to build the fix.
        </p>
        <p className="success-body">
          Because you took the time to help us shape the future of Jale AI,
          we'd like to invite you to be a <strong>Founding Design Partner</strong>.
          This means you'll get early access to our automated screening tools
          and a direct line to our team to ensure the platform actually solves
          the hiring headaches you just described.
        </p>
        <p className="success-body">
          If you're open to a 10-minute follow-up or want to be the first to
          test our "Ghost-Proof" features, we'll be in touch soon.
        </p>
        <p className="success-note">You may now close this tab.</p>
      </div>
    </div>
  );
}

export default SuccessStep;
