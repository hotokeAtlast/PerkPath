import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import PinGate from './components/PinGate';
import ApiKeyModal from './components/ApiKeyModal';
import FanPage from './pages/FanPage';
import AdminPage from './pages/AdminPage';
import './index.css';

function AppShell() {
  const { showConfigModal, handleSaveApiKey } = useApp();
  return (
    <>
      {showConfigModal && <ApiKeyModal onSave={handleSaveApiKey} />}
      <Routes>
        <Route path="/" element={<FanPage />} />
        <Route path="/admin" element={<PinGate><AdminPage /></PinGate>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
