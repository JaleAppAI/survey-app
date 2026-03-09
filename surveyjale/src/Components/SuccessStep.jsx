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
          {name ? `Thank you, ${name}!` : 'Thank you!'}
        </h1>
        <p className="success-body">
          Your responses have been submitted successfully.
          We appreciate your time and feedback.
        </p>
        <p className="success-note">You may now close this tab.</p>
      </div>
    </div>
  );
}

export default SuccessStep;
