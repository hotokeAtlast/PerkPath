import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';
import ApiKeyModal from './components/ApiKeyModal';
import FanPage from './pages/FanPage';
import AdminPage from './pages/AdminPage';
import './index.css';

function AppShell() {
  const { showConfigModal, handleSaveApiKey, toasts, dismissToast } = useApp();
  const { autoLogin } = useAuth();
  const handleSaveAndLogin = (key) => {
    handleSaveApiKey(key);
    autoLogin();
  };
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      {showConfigModal && <ApiKeyModal onSave={handleSaveAndLogin} />}
      <Routes>
        <Route path="/" element={<AdminPage />} />
        <Route path="/fan" element={<FanPage />} />
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
