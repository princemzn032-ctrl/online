import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  preferredDate: '',
  consent: false,
};

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PatientIntake() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!supabase) {
      setError('The database is not configured. Add the Supabase URL and publishable key, then restart the app.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('patient_intakes').insert({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        preferred_date: form.preferredDate || null,
        consent_to_contact: form.consent,
      });
      if (insertError) throw insertError;
      setForm(initialForm);
      setSuccess('Your appointment request has been received. The clinic can contact you using the details provided.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-shell container">
      <div className="auth-card">
        <div className="auth-side">
          <span className="eyebrow">Appointment request</span>
          <h2>Request a visit</h2>
          <p className="muted">Share your contact details and preferred date. The clinic will follow up to confirm availability.</p>

          {error ? <div className="form-message error" role="alert">{error}</div> : null}
          {success ? <div className="form-message success" role="status">{success}</div> : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                type="text"
                autoComplete="name"
                maxLength={120}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                autoComplete="tel"
                minLength={7}
                maxLength={30}
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                required
              />
            </label>
            <label>
              Preferred appointment date (optional)
              <input
                type="date"
                min={getToday()}
                value={form.preferredDate}
                onChange={(event) => setForm({ ...form, preferredDate: event.target.value })}
              />
            </label>
            <label className="consent-label">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => setForm({ ...form, consent: event.target.checked })}
                required
              />
              I agree that the clinic may contact me about this appointment request.
            </label>
            <button type="submit" className="primary-btn full-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Send request'}
            </button>
          </form>
        </div>

        <aside className="auth-side alt">
          <span className="eyebrow">Your privacy</span>
          <h3>Only share what is needed</h3>
          <p>Do not include symptoms, diagnoses, insurance details, or other medical information here. This form is for appointment contact requests only.</p>
          <p>Your request is stored privately. Public visitors cannot read or change submitted records.</p>
        </aside>
      </div>
    </section>
  );
}
