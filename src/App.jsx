import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import PinGate from './components/PinGate';
import FanPage from './pages/FanPage';
import AdminPage from './pages/AdminPage';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<FanPage />} />
          <Route path="/admin" element={<PinGate><AdminPage /></PinGate>} />
        </Routes>
      </AppProvider>
    </AuthProvider>
  );
}
