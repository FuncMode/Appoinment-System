// AdminLogin — public (split from screens-public.jsx)
import { useState } from 'react';
import { BrandMark, Field, Icon, navigate, OtpVerifyModal, TextInput, useStore } from '../shared/components.jsx';
import Aurora from '../shared/reactbits/Aurora.jsx';
import SplitText from '../shared/reactbits/SplitText.jsx';
import AnimatedContent from '../shared/reactbits/AnimatedContent.jsx';

// ---------- Admin login (staff console) ----------
// Separate, unlinked login for hospital staff/admin. Kept off the public
// patient login on purpose — patients never see staff entry points, and the
// admin console routes are guarded so this page is the only way in.
// NOTE: prototype-only. A real backend must verify staff credentials
// server-side and enforce role checks on every API request. Staff accounts
// are matched against the backend admins store once the API is wired.

function AdminLogin() {
  const store = useStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Step 2 of staff login: the emailed 6-character code gates the console —
  // the session is only created from onVerified. `pendingAdmin` holds the
  // account awaiting verification.
  const [otpOpen, setOtpOpen] = useState(false);
  const [pendingAdmin, setPendingAdmin] = useState(null);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); setAuthError(null); };

  const submit = (evt) => {
    evt.preventDefault();
    const e = {};
    if (!form.email.trim()) e.email = 'Staff email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid staff email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setLoading(false);
      const em = form.email.toLowerCase().trim();
      // Staff accounts live in the backend credential store (admins table)
      // once wired; until then no staff login can succeed
      const account = store.users.find(u => u.role === 'admin' && u.email.toLowerCase() === em);
      if (account && account.password === form.password) {
        // Credentials verified — the emailed code is the next gate
        setPendingAdmin(account);
        setOtpOpen(true);
      } else {
        // Generic message — does not reveal whether the staff account exists
        setAuthError('Invalid staff credentials. Please try again.');
      }
    }, 700);
  };

  const finishLogin = () => {
    store.loginAdmin({ email: pendingAdmin.email, name: pendingAdmin.name, role: pendingAdmin.role || 'Administrator' });
    store.setRole('admin');
    setOtpOpen(false);
    navigate('/admin/dashboard');
  };

  return (
    <main className="auth-shell">
      <AnimatedContent className="auth-slide" distance={260} direction="horizontal" reverse duration={0.7}>
      <div className="auth-visual-col auth-visual-col--forgot" style={{ order: 0 }}>
        <div className="auth-aurora" aria-hidden="true"><Aurora colorStops={['#60A5FA', '#E0F2FE', '#3B82F6']} amplitude={1.1} speed={0.6} blend={0.7} /></div>
        <BrandMark className="brand-mark" />
        <div>
          <div className="quote">"Behind every smooth appointment is a team that keeps the whole clinic in sync."</div>
          <div className="attrib">MedicaCare · Staff console</div>
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
              <div className="t-muted" style={{ fontSize: 12 }}>Staff console</div>
            </div>
          </div>
          <SplitText tag="h1" text="Staff sign in" splitType="chars" delay={30} duration={0.9} textAlign="left" rootMargin="0px" />
          <AnimatedContent distance={20} duration={0.5} delay={0.55}>
            <p className="sub">Restricted access for authorized hospital staff only.</p>
          </AnimatedContent>

          {authError && (
            <div role="alert" style={{ background: 'var(--error-soft)', border: '1px solid var(--error-border)', color: 'var(--error-text)', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon name="alert-circle" size={16} style={{ marginTop: 1 }} />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={submit} className="form-stack" noValidate>
            <Field label="Staff email" required error={errors.email}>
              <TextInput type="email" placeholder="staff@medicacare.ph" value={form.email}
                onChange={e => update('email', e.target.value)} error={errors.email} icon="mail" />
            </Field>
            <Field label="Password" required error={errors.password}>
              <TextInput type="password" placeholder="Enter your password" value={form.password}
                onChange={e => update('password', e.target.value)} error={errors.password} />
            </Field>

            <button type="submit" className={`btn btn-primary lg ${loading ? 'btn-loading' : ''}`}>
              Sign in to console
            </button>

            <div className="footer-link">
              Patient? <a href="#/login">Use the patient portal instead</a>
            </div>
          </form>
        </div>
      </div>
      </AnimatedContent>

      {/* Step 2 — the emailed 6-character code before the console opens */}
      <OtpVerifyModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerified={finishLogin}
        email={pendingAdmin ? pendingAdmin.email : ''}
        title="Verify staff sign-in"
        subtitle={`Enter the code sent to ${pendingAdmin ? pendingAdmin.email : 'your email'} to open the admin console.`}
      />
    </main>
  );
}

export { AdminLogin };
