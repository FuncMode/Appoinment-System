

// Barrel module — the individual screens live in their own files now.
// This file keeps the original module path so existing imports unchanged.

import { PatientDashboard } from './PatientDashboard.jsx';
import { DoctorListing } from './DoctorListing.jsx';
import { DoctorAvailability } from './DoctorAvailability.jsx';
import { BookAppointment } from './BookAppointment.jsx';
import { BookingConfirmation } from './BookingConfirmation.jsx';
import { AppointmentStatus } from './AppointmentStatus.jsx';
import { AppointmentHistory } from './AppointmentHistory.jsx';
import { AppointmentDetails } from './AppointmentDetails.jsx';
import { Profile } from './Profile.jsx';
import { MedicalRecords } from './MedicalRecords.jsx';
import { PatientMessages } from './PatientMessages.jsx';
import { HelpSupport } from './HelpSupport.jsx';

Object.assign(window, { PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment, BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile, MedicalRecords, PatientMessages, HelpSupport });

export { PatientDashboard, DoctorListing, DoctorAvailability, BookAppointment, BookingConfirmation, AppointmentStatus, AppointmentHistory, AppointmentDetails, Profile, MedicalRecords, PatientMessages, HelpSupport };
