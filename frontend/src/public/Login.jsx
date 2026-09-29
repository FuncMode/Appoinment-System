// Login — public (split from screens-public.jsx)
import { useState } from 'react';
import { BrandMark, Field, Icon, navigate, OtpVerifyModal, PwField, TextInput, useStore } from '../shared/components.jsx';
import { CURRENT_PATIENT, PATIENT_CREDENTIALS, SHOW_DEMO_PASSWORDS } from '../shared/data.js';
import Aurora from '../shared/reactbits/Aurora.jsx';
import SplitText from '../shared/reactbits/SplitText.jsx';
import AnimatedContent from '../shared/reactbits/AnimatedContent.jsx';

import { AdminLogin } from './AdminLogin.jsx';

// ---------- Login ----------
function Login() {
  const store = useStore();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Step 2 of login (prototype demo): after the credentials check passes,
  // a 6-character code must be entered before the portal opens. `otpAccount`
  // holds the account awaiting verification; the account is only logged in
  // from the OTP modal's onVerified callback.
  const [otpAccount, setOtpAccount] = useState(null);

  const finishLogin = (account) => {
    // Registered account (including the seeded demo patient) — enter the
    // portal as that patient identity so bookings/history belong to them
    if (account.id === CURRENT_PATIENT.id) {
      store.setCurrentPatient(CURRENT_PATIENT);
    } else {
      store.setCurrentPatient({
        id: account.id, name: account.name, email: account.email, phone: account.phone,
        dob: '', gender: '', address: '', emergencyContact: '', bloodType: '—', allergies: 'None',
        photo: account.photo || '',
      });
    }
    store.loginPatient(account);
    store.setRole('patient');
    setOtpAccount(null);
    navigate('/patient/dashboard');
  };

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); setAuthError(null); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setLoading(false);
      const em = form.email.toLowerCase().trim();
      const account = store.users.find(u => u.email.toLowerCase() === em);
      if (account && account.password === form.password) {
        // Credentials verified — the emailed code is the next gate
        setOtpAccount(account);
      } else {
        setAuthError(account
          ? 'The password you entered is incorrect. Please try again.'
          : 'No account found with this email. Please register first.');
      }
    }, 700);
  };

  // Demo account accordion — collapsed by default to keep the form clean.
  // Patient credentials only; the staff login lives on the separate AdminLogin
  // screen so admin credentials are never exposed on the public login page.
  const [demoOpen, setDemoOpen] = useState(false);

  const useDemo = () => {
    setForm({ email: PATIENT_CREDENTIALS.email, password: PATIENT_CREDENTIALS.password, remember: true });
    setErrors({}); setAuthError(null);
  };

  return (
    <main className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-visual-col auth-visual-col--login" style={{ order: 0 }}>
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Care that fits your schedule. See a specialist without the runaround."</div>
          <div className="attrib">MedicaCare</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          © 2026 MedicaCare
        </div>
      </div>
      </AnimatedContent>
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" duration={0.7}>
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div>
            <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginLeft: -10, marginBottom: 16 }}>
              <Icon name="arrow-left" size={16} /> Back to home
            </button>
          </div>
          <div className="brand">
            <BrandMark size={36} />
            <div>
              <div style={{ fontWeight: 600 }}>MedicaCare</div>
              <div className="t-muted" style={{ fontSize: 12 }}>Patient portal</div>
            </div>
          </div>
          <SplitText tag="h1" text="Welcome back" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">Log in to book appointments and view your records.</p>
          </AnimatedContent>

          {authError && (
            <div role="alert" style={{ background: 'var(--error-soft)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Email address" required error={errors.email}>
              <TextInput type="email" placeholder="you@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <PwField label="Password" required error={errors.password} autoComplete="current-password"
              value={form.password} onChange={e => update('password', e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="checkbox">
                <input type="checkbox" checked={form.remember} onChange={e => update('remember', e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a href="#/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>Forgot password?</a>
            </div>

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Log in
            </button>

            <div className="footer-link">
              New here? <a href="#/register">Create an account</a>
            </div>
          </form>

          <div className={`demo-accounts ${demoOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="demo-accounts-toggle"
              aria-expanded={demoOpen}
              onClick={() => setDemoOpen(o => !o)}
            >
              <span className="demo-accounts-title">Demo accounts: click to use</span>
              <Icon name="chevron-down" size={14} />
            </button>
            {demoOpen && (
              <button type="button" className="demo-account" onClick={useDemo}>
                <span className="avatar sm">JB</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{PATIENT_CREDENTIALS.email}</span>
                  {SHOW_DEMO_PASSWORDS && (
                    <span className="t-muted" style={{ display: 'block', fontSize: 11 }}>Password: {PATIENT_CREDENTIALS.password}</span>
                  )}
                </span>
                <span className="demo-account-role">Patient</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </AnimatedContent>

      {/* Step 2 — the emailed 6-character code gates the portal itself;
          the session is only created from onVerified */}
      <OtpVerifyModal
        open={!!otpAccount}
        onClose={() => setOtpAccount(null)}
        onVerified={() => finishLogin(otpAccount)}
        email={otpAccount ? otpAccount.email : ''}
        title="Verify your login"
        subtitle={`Enter the code sent to ${otpAccount ? otpAccount.email : 'your email'} to open your patient portal.`}
      />
    </main>
  );
}

export { Login };
