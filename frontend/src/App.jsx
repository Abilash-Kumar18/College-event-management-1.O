import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import SignUpRole from './pages/SignUpRole';
import StudentSignUp from './pages/StudentSignUp';
import OrganizerSignUp from './pages/OrganizerSignUp';
import ForgotPassword from './pages/ForgotPassword';
import Verification from './pages/Verification';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EventRegister from './pages/EventRegister';

import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpRole />} />
        <Route path="/signup/student" element={<StudentSignUp />} />
        <Route path="/signup/organizer" element={<OrganizerSignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify" element={<Verification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/register" element={<EventRegister />} />
      </Routes>
    </Router>
  );
}

export default App;