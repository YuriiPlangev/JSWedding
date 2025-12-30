import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ClientDashboard from '../pages/ClientDashboard';
import OrganizerDashboard from '../pages/OrganizerDashboard';
import MainOrganizerDashboard from '../pages/MainOrganizerDashboard';
import EventDetailPage from '../pages/EventDetailPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {loading || !user ? (
              // Показываем загрузку, пока user не загружен
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Загрузка...</div>
              </div>
            ) : user.role === 'main_organizer' ? (
              // Если главный организатор, перенаправляем на /main-organizer
              <Navigate to="/main-organizer" replace />
            ) : user.role === 'organizer' ? (
              // Если организатор, перенаправляем на /organizer
              <Navigate to="/organizer" replace />
            ) : (
              // Иначе показываем ClientDashboard
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
      <Route
        path="/main-organizer"
        element={
          <ProtectedRoute requiredRole="main_organizer">
            <MainOrganizerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/main-organizer/event/:eventId"
        element={
          <ProtectedRoute requiredRole="main_organizer">
            <EventDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

