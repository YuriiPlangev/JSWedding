import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'client' | 'organizer';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Пока идет загрузка сессии или пользователя, не делаем редирект
  if (loading || (isAuthenticated && !user)) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если пользователь загружен и это организатор, но он на странице без requiredRole="organizer"
  // и находится на /dashboard или /client, перенаправляем на /organizer
  if (user && user.role === 'organizer' && !requiredRole) {
    // Проверяем, не пытается ли организатор попасть на страницу клиента
    // Это обрабатывается в AppRoutes, но добавим дополнительную защиту
    if (location.pathname === '/dashboard' || location.pathname === '/client') {
      return <Navigate to="/organizer" replace />;
    }
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Перенаправляем на правильную страницу в зависимости от роли
    if (user?.role === 'organizer') {
      return <Navigate to="/organizer" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

