import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'client' | 'organizer' | 'main_organizer';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Пока идет загрузка сессии или пользователя, показываем загрузку, но не делаем редирект
  // Это позволяет сохранить текущий URL при перезагрузке страницы
  if (loading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если пользователь загружен и это организатор или главный организатор, но он на странице без requiredRole
  // и находится на /dashboard или /client, перенаправляем на соответствующую страницу
  if (user && (user.role === 'organizer' || user.role === 'main_organizer') && !requiredRole) {
    // Проверяем, не пытается ли организатор попасть на страницу клиента
    // Это обрабатывается в AppRoutes, но добавим дополнительную защиту
    if (location.pathname === '/dashboard' || location.pathname === '/client') {
      if (user.role === 'main_organizer') {
        return <Navigate to="/main-organizer" replace />;
      }
      return <Navigate to="/organizer" replace />;
    }
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Перенаправляем на правильную страницу в зависимости от роли
    // НО только если пользователь не находится уже на правильной странице
    if (user?.role === 'main_organizer') {
      if (location.pathname === '/main-organizer') {
        return <>{children}</>;
      }
      return <Navigate to="/main-organizer" replace />;
    }
    if (user?.role === 'organizer') {
      // Если пользователь уже на /organizer, не делаем редирект
      if (location.pathname === '/organizer') {
        return <>{children}</>;
      }
      return <Navigate to="/organizer" replace />;
    }
    // Если пользователь уже на /dashboard, не делаем редирект
    if (location.pathname === '/dashboard') {
      return <>{children}</>;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

