import { useAuth } from '../context/AuthContext';
import type { WeddingEvent, Task, Notification } from '../types';

const OrganizerDashboard = () => {
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
    {
      id: '2',
      title: 'Свадьба Марии и Петра',
      date: '2024-07-20',
      location: 'Банкетный зал "Роскошь"',
      status: 'confirmed',
      budget: 750000,
      guestCount: 150,
    },
  ];

  const tasks: Task[] = [
    {
      id: '1',
      wedding_id: '1',
      title: 'Согласовать меню с клиентом',
      due_date: '2024-05-01',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      wedding_id: '2',
      title: 'Заказать декорации',
      due_date: '2024-05-15',
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      wedding_id: '1',
      title: 'Подготовить договор',
      due_date: '2024-04-25',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Новый запрос',
      message: 'Новый клиент запросил консультацию',
      type: 'info',
      read: false,
      createdAt: '2024-04-20T10:00:00',
    },
  ];

  const stats = {
    totalEvents: events.length,
    activeEvents: events.filter((e) => e.status === 'planning' || e.status === 'confirmed').length,
    completedEvents: events.filter((e) => e.status === 'completed').length,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Панель организатора
            </h1>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-sm md:text-base text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Приветствие */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
            Добро пожаловать, {user?.name}!
          </h2>
          <p className="text-sm md:text-base text-gray-600">
            Управление свадебными событиями и клиентами
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="text-2xl md:text-3xl font-bold text-gray-800">{stats.totalEvents}</div>
            <div className="text-xs md:text-sm text-gray-600 mt-1">Всего событий</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.activeEvents}</div>
            <div className="text-xs md:text-sm text-gray-600 mt-1">Активных</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.completedEvents}</div>
            <div className="text-xs md:text-sm text-gray-600 mt-1">Завершено</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="text-2xl md:text-3xl font-bold text-yellow-600">{stats.pendingTasks}</div>
            <div className="text-xs md:text-sm text-gray-600 mt-1">Задач в ожидании</div>
          </div>
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
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">События</h3>
              <button className="text-xs md:text-sm text-pink-600 hover:text-pink-700 font-medium">
                + Добавить
              </button>
            </div>
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
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
                  <div className="flex justify-between items-center mt-2">
                    {event.budget && (
                      <p className="text-sm font-medium text-gray-700">
                        Бюджет: {event.budget.toLocaleString('ru-RU')} ₽
                      </p>
                    )}
                    <button className="text-sm text-pink-600 hover:text-pink-700">
                      Подробнее →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Задачи */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Задачи</h3>
              <button className="text-xs md:text-sm text-pink-600 hover:text-pink-700 font-medium">
                + Добавить
              </button>
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{task.title}</h4>
                  </div>
                  <div className="flex justify-between items-center">
                    {task.due_date && (
                      <span className="text-xs text-gray-500">
                        До: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                      </span>
                    )}
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

export default OrganizerDashboard;

