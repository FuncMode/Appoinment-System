

// Barrel module — the individual screens live in their own files now.
// This file keeps the original module path so existing imports unchanged.

import { AdminDashboard } from './AdminDashboard.jsx';
import { PatientsMgmt } from './PatientsMgmt.jsx';
import { PatientFormModal } from './PatientFormModal.jsx';
import { DoctorsMgmt } from './DoctorsMgmt.jsx';
import { DoctorFormModal } from './DoctorFormModal.jsx';
import { AppointmentsMgmt } from './AppointmentsMgmt.jsx';
import { StoriesMgmt } from './StoriesMgmt.jsx';
import { TicketsMgmt } from './TicketsMgmt.jsx';
import { AdminReports } from './AdminReports.jsx';
import { AdminSettings } from './AdminSettings.jsx';
import { AdminActivity } from './AdminActivity.jsx';

Object.assign(window, { AdminDashboard, PatientsMgmt, DoctorsMgmt, AppointmentsMgmt, StoriesMgmt, TicketsMgmt, AdminReports, AdminSettings, AdminActivity });

export { AdminDashboard, PatientsMgmt, PatientFormModal, DoctorsMgmt, DoctorFormModal, AppointmentsMgmt, StoriesMgmt, TicketsMgmt, AdminReports, AdminSettings, AdminActivity };
