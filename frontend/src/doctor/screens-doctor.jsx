// ============================================================
// Doctor portal — MedicaCare (third prototype role)
// Doctors log in to see their own schedule and complete their own visits.
// Visit notes are written by the doctor here (attributed to them), then
// surface on the patient's Medical Records page — the same store field the
// admin console can encode on the doctor's behalf when offline.
// ============================================================

// Barrel module — the individual screens live in their own files now.
// This file keeps the original module path so existing imports unchanged.

import { DoctorDashboard } from './DoctorDashboard.jsx';
import { DoctorPatients } from './DoctorPatients.jsx';
import { DoctorWeekView } from './DoctorWeekView.jsx';
import { DoctorFeedback } from './DoctorFeedback.jsx';

Object.assign(window, { DoctorDashboard, DoctorPatients, DoctorWeekView, DoctorFeedback });

export { DoctorDashboard, DoctorPatients, DoctorWeekView, DoctorFeedback };
