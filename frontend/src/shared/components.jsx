// ============================================================
// Shared components — MedicaCare
// ============================================================

// Barrel module — shared UI now lives in layered modules. store.jsx is the
// single home of StoreCtx/StoreProvider/useStore; layers: store/hooks/icons
// → ui/charts → layout/auth. This path keeps every existing import unchanged.

import { Icon } from './icons.jsx';
import { useHashRoute } from './hooks.js';
import { navigate } from './hooks.js';
import { useStore } from './store.jsx';
import { StoreProvider } from './store.jsx';
import { useIsDesktop } from './hooks.js';
import { DesktopOnlyNotice } from './layout.jsx';
import { Sidebar } from './layout.jsx';
import { Topbar } from './layout.jsx';
import { AppShell } from './layout.jsx';
import { PublicNav } from './layout.jsx';
import { PublicFooter } from './layout.jsx';
import { PageHeader } from './layout.jsx';
import { BrandMark } from './layout.jsx';
import { Badge } from './ui.jsx';
import { StatusBadge } from './ui.jsx';
import { DoctorStatusBadge } from './ui.jsx';
import { DoctorAvatar } from './ui.jsx';
import { PatientAvatar } from './ui.jsx';
import { Modal } from './ui.jsx';
import { ToastLayer } from './ui.jsx';
import { Field } from './ui.jsx';
import { TextInput } from './ui.jsx';
import { TextArea } from './ui.jsx';
import { SelectInput } from './ui.jsx';
import { Pagination } from './ui.jsx';
import { SkeletonRows } from './ui.jsx';
import { SortableTh } from './ui.jsx';
import { PageSpinner } from './ui.jsx';
import { EmptyState } from './ui.jsx';
import { ErrorState } from './ui.jsx';
import { ConfirmModal } from './ui.jsx';
import { MiniBarChart } from './charts.jsx';
import { Sparkline } from './charts.jsx';
import { NoticeBar } from './layout.jsx';
import { ClinicStatus } from './layout.jsx';
import { FaqAccordion } from './layout.jsx';
import { TestimonialCarousel } from './layout.jsx';
import { computeDoctorRating } from './charts.jsx';
import { DoctorRatingPill } from './charts.jsx';
import { PwField } from './auth.jsx';
import { OtpVerifyModal } from './auth.jsx';
import { generateOtp } from './ui.jsx';

Object.assign(window, { Icon, useHashRoute, navigate, StoreProvider, useStore, useIsDesktop, DesktopOnlyNotice, Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader, Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar, Modal, ConfirmModal, ToastLayer, Field, TextInput, TextArea, SelectInput, Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, MiniBarChart, Sparkline, NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel, computeDoctorRating, DoctorRatingPill, PwField, OtpVerifyModal, generateOtp });

export { Icon, useHashRoute, navigate, useStore, StoreProvider, useIsDesktop, DesktopOnlyNotice, Sidebar, Topbar, AppShell, PublicNav, PublicFooter, PageHeader, BrandMark, Badge, StatusBadge, DoctorStatusBadge, DoctorAvatar, PatientAvatar, Modal, ToastLayer, Field, TextInput, TextArea, SelectInput, Pagination, SkeletonRows, SortableTh, PageSpinner, EmptyState, ErrorState, ConfirmModal, MiniBarChart, Sparkline, NoticeBar, ClinicStatus, FaqAccordion, TestimonialCarousel, computeDoctorRating, DoctorRatingPill, PwField, OtpVerifyModal, generateOtp };
