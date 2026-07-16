import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import PinGate from './components/PinGate';
import ApiKeyModal from './components/ApiKeyModal';
import FanPage from './pages/FanPage';
import AdminPage from './pages/AdminPage';
import './index.css';

function AppShell() {
  const { showConfigModal, handleSaveApiKey, toasts, dismissToast } = useApp();
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Toast toasts={toasts} onDismiss={dismissToast} />
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
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
