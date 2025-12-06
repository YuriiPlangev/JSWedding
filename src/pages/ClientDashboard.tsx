import { useAuth } from '../context/AuthContext';
import type { WeddingEvent, Task, Notification } from '../types';

const ClientDashboard = () => {
  const { user, logout } = useAuth();

  // Пример данных (в реальном приложении будут загружаться с сервера)
  const events: WeddingEvent[] = [
    {
      id: '1',
      title: 'Свадьба Анны и Ивана',
      date: '2024-06-15',
      location: 'Ресторан "Элегант"',
      status: 'planning',
      budget: 500000,
      guestCount: 100,
    },
  ];

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Выбрать меню',
      description: 'Согласовать меню с рестораном',
      dueDate: '2024-05-01',
      status: 'pending',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Заказать фотографа',
      dueDate: '2024-05-10',
      status: 'in_progress',
      priority: 'medium',
    },
  ];

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Новое сообщение',
      message: 'Организатор отправил вам новое сообщение',
      type: 'info',
      read: false,
      createdAt: '2024-04-20T10:00:00',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              Личный кабинет клиента
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Приветствие */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Добро пожаловать, {user?.name}!
          </h2>
          <p className="text-gray-600">
            Здесь вы можете управлять своими свадебными событиями
          </p>
        </div>

        {/* Уведомления */}
        {notifications.length > 0 && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Уведомления</h3>
            {notifications.map((notif) => (
              <div key={notif.id} className="text-blue-800">
                {notif.title}: {notif.message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Свадебные события */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Мои события
            </h3>
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{event.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        event.status === 'planning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : event.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {event.status === 'planning'
                        ? 'Планирование'
                        : event.status === 'confirmed'
                        ? 'Подтверждено'
                        : event.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Дата: {new Date(event.date).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Место: {event.location}
                  </p>
                  {event.budget && (
                    <p className="text-sm text-gray-600">
                      Бюджет: {event.budget.toLocaleString('ru-RU')} ₽
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Задачи */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Задачи</h3>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{task.title}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        task.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {task.priority === 'high'
                        ? 'Высокий'
                        : task.priority === 'medium'
                        ? 'Средний'
                        : 'Низкий'}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      До: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {task.status === 'completed'
                        ? 'Выполнено'
                        : task.status === 'in_progress'
                        ? 'В работе'
                        : 'Ожидает'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;

