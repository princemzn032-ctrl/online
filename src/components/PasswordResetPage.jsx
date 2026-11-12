import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../api';

export default function PasswordResetPage({ reset = false }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      if (reset) {
        if (!token) throw new Error('The password reset link is missing its token.');
        if (password !== confirmation) throw new Error('Passwords do not match.');
        const result = await resetPassword({ token, password });
        setMessage(result.message);
      } else {
        const result = await requestPasswordReset(email.trim());
        setMessage(result.message);
      }
    } catch (requestError) {
      setError(requestError.message || 'Password recovery could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container password-recovery-page">
      <div className="panel-box password-recovery-card">
        <span className="eyebrow">Account security</span>
        <h1>{reset ? 'Choose a new password' : 'Reset your password'}</h1>
        <p>{reset ? 'Reset links expire after one hour and can only be used once.' : 'Enter your account email and we will send a one-time reset link.'}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {reset ? (
            <>
              <label>
                New password
                <input type="password" value={password} minLength={8} required onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label>
                Confirm new password
                <input type="password" value={confirmation} minLength={8} required onChange={(event) => setConfirmation(event.target.value)} />
              </label>
            </>
          ) : (
            <label>
              Email
              <input type="email" autoComplete="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
            </label>
          )}
          {error ? <div className="form-message error" role="alert">{error}</div> : null}
          {message ? <div className="form-message success" role="status">{message}</div> : null}
          <button type="submit" className="primary-btn full-btn" disabled={loading}>
            {loading ? 'Please wait...' : reset ? 'Update password' : 'Send reset link'}
          </button>
        </form>
        <Link to="/auth" className="text-action">Back to login</Link>
      </div>
    </section>
  );
}
