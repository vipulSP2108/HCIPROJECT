import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import OTPVerificationPage from "./pages/auth/OTPVerificationPage";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientAnalytics from "./pages/doctor/PatientAnalytics";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import ChatPage from "./pages/common/ChatPage";
import RemindersPage from "./pages/common/RemindersPage";
import AvailabilityPage from "./pages/doctor/AvailabilityPage";
import SchedulePage from "./pages/doctor/SchedulePage";
import DoctorCaretakerManagement from "./pages/doctor/DoctorCaretakerManagement";

import CaretakerDashboard from "./pages/caretaker/CaretakerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PianoReactionGame from "./pages/game/PianoReactionGame/PianoReactionGame";
import ShapeTracingGame from "./pages/game/ShapeTracingGame/ShapeTracingGame";
import BoardDrawingGame from "./pages/game/BoardDrawingGame/BoardDrawingGame";
import FruitBasketGame from "./pages/game/FruitBasketGame/FruitBasketGame";
import InCamGame from "./pages/game/InCamGame/InCamGame";
import ProtectedRoute from "./components/common/ProtectedRoute";
import CreatePatientForm from "./components/admin/CreatePatientForm";
import DoctorProfileForm from "./pages/doctor/DoctorProfileForm";
import PatientSetting from "./pages/patient/PatientSetting";
import GameCalibrationPage from "./pages/game/GameCalibrationPage";
import GameAnalytics from "./pages/game/BoardDrawingGame/GameAnalytics";
import AccessibilityWidget from "./components/common/AccessibilityWidget";
import AssessmentStartPage from "./pages/assessment/AssessmentStartPage";
import AssessmentRunPage from "./pages/assessment/AssessmentRunPage";
import AssessmentReportPage from "./pages/assessment/AssessmentReportPage";
import ClinicalTestPage from "./pages/assessment/ClinicalTestPage";

import NetworkSyncManager from "./components/common/NetworkSyncManager";

import { SettingsProvider } from "./context/SettingsContext";

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NetworkSyncManager />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AccessibilityWidget />
          <Routes>
            <Route path="/analytics" element={<GameAnalytics />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<OTPVerificationPage />} />
            <Route
              path="/doctor/manage-caretakers"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  <DoctorCaretakerManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/patient/:patientId"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  <PatientAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedTypes={["patient"]}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute allowedTypes={["patient"]}>
                  <PatientAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute allowedTypes={["doctor", "patient", "caretaker"]}>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminders"
              element={
                <ProtectedRoute allowedTypes={["doctor", "patient", "caretaker"]}>
                  <RemindersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/availability"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  <AvailabilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/schedule"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/caretaker/dashboard"
              element={
                <ProtectedRoute allowedTypes={["caretaker"]}>
                  <CaretakerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedTypes={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/piano-reaction"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <PianoReactionGame />
                </ProtectedRoute>
              }
            />

            <Route
              path="/shape-tracing"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <ShapeTracingGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/board-drawing"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <BoardDrawingGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fruit-basket"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <FruitBasketGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/in-cam-game"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <InCamGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calibration"
              element={
                <ProtectedRoute allowedTypes={["patient", "caretaker"]}>
                  <GameCalibrationPage />
                </ProtectedRoute>
              }
            />

            {/* ── Assessment Module ───────────────────────────────────── */}
            <Route
              path="/assessment/start"
              element={
                <ProtectedRoute allowedTypes={["patient", "doctor", "caretaker"]}>
                  <AssessmentStartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/run/:id"
              element={
                <ProtectedRoute allowedTypes={["patient", "doctor", "caretaker"]}>
                  <AssessmentRunPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/report/:id"
              element={
                <ProtectedRoute allowedTypes={["patient", "doctor", "caretaker"]}>
                  <AssessmentReportPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/assessment/clinical/:id"
              element={
                <ProtectedRoute allowedTypes={["patient", "doctor", "caretaker"]}>
                  <ClinicalTestPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/profile"
              element={
                <ProtectedRoute allowedTypes={["doctor", "patient"]}>
                  <DoctorProfileForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/setting"
              element={
                <ProtectedRoute allowedTypes={["patient"]}>
                  <PatientSetting />
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/create-patient"
              element={
                <ProtectedRoute allowedTypes={["doctor"]}>
                  {/* This page will now render your form */}
                  <div className="p-6 bg-gray-100 min-h-screen">
                    <CreatePatientForm
                      onPatientCreated={() => {
                        /* optional callback */
                      }}
                    />
                  </div>
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
