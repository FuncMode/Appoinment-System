

// Barrel module — the individual screens live in their own files now.
// This file keeps the original module path so existing imports unchanged.

import { Landing } from './Landing.jsx';
import { Register } from './Register.jsx';
import { Login } from './Login.jsx';
import { AdminLogin } from './AdminLogin.jsx';
import { DoctorLogin } from './DoctorLogin.jsx';
import { ForgotPassword } from './ForgotPassword.jsx';
import { ServicesPage } from './ServicesPage.jsx';
import { DoctorsPage } from './DoctorsPage.jsx';
import { AboutPage } from './AboutPage.jsx';
import { ContactPage } from './ContactPage.jsx';
import { PrivacyPage } from './PrivacyPage.jsx';
import { TermsPage } from './TermsPage.jsx';
import { CARE_GUIDE } from './content.js';

Object.assign(window, { Landing, Register, Login, AdminLogin, DoctorLogin, ForgotPassword, ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage, CARE_GUIDE });

export { Landing, Register, Login, AdminLogin, DoctorLogin, ForgotPassword, ServicesPage, DoctorsPage, AboutPage, ContactPage, PrivacyPage, TermsPage, CARE_GUIDE };
