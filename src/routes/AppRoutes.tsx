import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ClientDashboard from '../pages/ClientDashboard';
import OrganizerDashboard from '../pages/OrganizerDashboard';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'organizer' ? (
              <OrganizerDashboard />
            ) : (
              <ClientDashboard />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/client"
        element={
          <ProtectedRoute requiredRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer"
        element={
          <ProtectedRoute requiredRole="organizer">
            <OrganizerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

