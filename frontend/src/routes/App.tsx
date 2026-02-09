import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from '../views/Landing';
import LoginDoctor from '../views/login/LoginDoctor';
import LoginPatient from '../views/login/LoginPatient';
import LoginPremed from '../views/login/LoginPremed';
import DoctorDashboard from '../views/doctor/DoctorDashboard';
import PatientDashboard from '../views/patient/PatientDashboard';
import PremedDashboard from '../views/premed/PremedDashboard';
import { RequireAuth, RequireRole } from './Guards';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login/doctor" element={<LoginDoctor />} />
      <Route path="/login/patient" element={<LoginPatient />} />
      <Route path="/login/premed" element={<LoginPremed />} />

      <Route
        path="/doctor/*"
        element={
          <RequireAuth>
            <RequireRole role="doctor">
              <DoctorDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/patient/*"
        element={
          <RequireAuth>
            <RequireRole role="patient">
              <PatientDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/premed/*"
        element={
          <RequireAuth>
            <RequireRole role="premed">
              <PremedDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
