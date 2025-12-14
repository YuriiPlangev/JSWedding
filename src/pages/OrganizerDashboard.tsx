import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService } from '../services/weddingService';
import type { Wedding, Task, Document, User } from '../types';

type ViewMode = 'overview' | 'weddings' | 'clients' | 'wedding-details';

interface SelectedWedding extends Wedding {
  client?: User;
  tasks?: Task[];
  documents?: Document[];
}

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedWedding, setSelectedWedding] = useState<SelectedWedding | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояния для модальных окон
  const [showWeddingModal, setShowWeddingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'organizer') {
      loadData();
    } else if (user && user.role !== 'organizer') {
      // Если пользователь не организатор, перенаправляем
      window.location.href = '/dashboard';
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [weddingsData, clientsData] = await Promise.all([
        weddingService.getOrganizerWeddings(user.id),
        clientService.getAllClients(),
      ]);

      setWeddings(weddingsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка при загрузке данных. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };

  const loadWeddingDetails = async (weddingId: string) => {
    setLoading(true);
    try {
      const wedding = await weddingService.getWeddingById(weddingId);
      if (!wedding) {
        setError('Свадьба не найдена');
        setLoading(false);
        return;
      }

      const client = await clientService.getClientById(wedding.client_id);
      const [tasks, documents] = await Promise.all([
        taskService.getWeddingTasks(weddingId),
        documentService.getWeddingDocuments(weddingId),
      ]);

      setSelectedWedding({
        ...wedding,
        client: client || undefined,
        tasks,
        documents,
      });

      setViewMode('wedding-details');
    } catch (err) {
      console.error('Error loading wedding details:', err);
      setError('Ошибка при загрузке деталей свадьбы');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWedding = () => {
    setEditingWedding(null);
    setShowWeddingModal(true);
  };

  const handleEditWedding = (wedding: Wedding) => {
    setEditingWedding(wedding);
    setShowWeddingModal(true);
  };

  const handleDeleteWedding = async (weddingId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту свадьбу? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const success = await weddingService.deleteWedding(weddingId);
      if (success) {
        await loadData();
        if (selectedWedding?.id === weddingId) {
          setSelectedWedding(null);
          setViewMode('weddings');
        }
      } else {
        setError('Не удалось удалить свадьбу');
      }
    } catch (err) {
      console.error('Error deleting wedding:', err);
      setError('Ошибка при удалении свадьбы');
    }
  };

  const handleSaveWedding = async (weddingData: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) return;

    try {
      if (editingWedding) {
        await weddingService.updateWedding(editingWedding.id, weddingData);
      } else {
        await weddingService.createWedding({
          ...weddingData,
          organizer_id: user.id,
        });
      }

      setShowWeddingModal(false);
      setEditingWedding(null);
      await loadData();
    } catch (err) {
      console.error('Error saving wedding:', err);
      setError('Ошибка при сохранении свадьбы');
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedWedding) return;

    try {
      if (editingTask) {
        await taskService.updateTask(editingTask.id, taskData, selectedWedding.id);
      } else {
        await taskService.createTask({
          ...taskData,
          wedding_id: selectedWedding.id,
        });
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Ошибка при сохранении задачи');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      const success = await taskService.deleteTask(taskId, selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить задачу');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Ошибка при удалении задачи');
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentModal(true);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const success = await documentService.deleteDocument(
        document.id,
        document.file_path,
        selectedWedding.id
      );
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить документ');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Ошибка при удалении документа');
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowDocumentModal(true);
  };

  const handleSaveDocument = async (
    docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>,
    file?: File
  ) => {
    if (!selectedWedding) return;

    try {
      if (editingDocument) {
        await documentService.updateDocument(editingDocument.id, docData, selectedWedding.id);
      } else {
        await documentService.createDocument(docData, file);
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Ошибка при сохранении документа');
    }
  };

  const stats = {
    totalWeddings: weddings.length,
    totalClients: clients.length,
    totalTasks: selectedWedding?.tasks?.length || 0,
    completedTasks: selectedWedding?.tasks?.filter(t => t.status === 'completed').length || 0,
  };

  if (loading && weddings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Панель организатора</h1>
              <p className="text-sm text-gray-600 mt-1">Добро пожаловать, {user?.name}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setViewMode('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'overview'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Обзор
            </button>
            <button
              onClick={() => setViewMode('weddings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'weddings'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Свадьбы ({weddings.length})
            </button>
            <button
              onClick={() => setViewMode('clients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'clients'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Клиенты ({clients.length})
            </button>
            {viewMode === 'wedding-details' && selectedWedding && (
              <button
                className="py-4 px-1 border-b-2 font-medium text-sm border-pink-500 text-pink-600"
              >
                {selectedWedding.couple_name_1_ru} & {selectedWedding.couple_name_2_ru}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Закрыть
            </button>
          </div>
        )}

        {viewMode === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Обзор</h2>
            
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="text-3xl font-bold text-gray-800">{stats.totalWeddings}</div>
                <div className="text-sm text-gray-600 mt-1">Всего свадеб</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="text-3xl font-bold text-blue-600">{stats.totalClients}</div>
                <div className="text-sm text-gray-600 mt-1">Клиентов</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="text-3xl font-bold text-green-600">{stats.completedTasks}</div>
                <div className="text-sm text-gray-600 mt-1">Выполненных задач</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.totalTasks - stats.completedTasks}
                </div>
                <div className="text-sm text-gray-600 mt-1">Задач в работе</div>
              </div>
            </div>

            {/* Recent Weddings */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Последние свадьбы</h3>
                <button
                  onClick={() => setViewMode('weddings')}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  Смотреть все →
                </button>
              </div>
              {weddings.slice(0, 5).length > 0 ? (
                <div className="space-y-4">
                  {weddings.slice(0, 5).map((wedding) => (
                    <div
                      key={wedding.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => loadWeddingDetails(wedding.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {wedding.couple_name_1_ru} & {wedding.couple_name_2_ru}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(wedding.wedding_date).toLocaleDateString('ru-RU')} • {wedding.venue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Нет свадеб</p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'weddings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Свадьбы</h2>
              <button
                onClick={handleCreateWedding}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
              >
                + Добавить свадьбу
              </button>
            </div>

            {weddings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {weddings.map((wedding) => (
                  <div
                    key={wedding.id}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                          {wedding.couple_name_1_ru} & {wedding.couple_name_2_ru}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Дата: {new Date(wedding.wedding_date).toLocaleDateString('ru-RU')}
                        </p>
                        <p className="text-sm text-gray-600">Место: {wedding.venue}</p>
                        <p className="text-sm text-gray-600">Гостей: {wedding.guest_count}</p>
                        {wedding.chat_link && (
                          <p className="text-sm text-blue-600 mt-1">
                            <a href={wedding.chat_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              Чат: {wedding.chat_link.length > 30 ? wedding.chat_link.substring(0, 30) + '...' : wedding.chat_link}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadWeddingDetails(wedding.id)}
                        className="flex-1 px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition text-sm"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={() => handleEditWedding(wedding)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteWedding(wedding.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-gray-500 mb-4">У вас пока нет свадеб</p>
                <button
                  onClick={handleCreateWedding}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
                >
                  Создать первую свадьбу
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'clients' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Клиенты</h2>

            {clients.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Свадьбы
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => {
                      const clientWeddings = weddings.filter(w => w.client_id === client.id);
                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {clientWeddings.length > 0 ? (
                                <button
                                  onClick={() => {
                                    loadWeddingDetails(clientWeddings[0].id);
                                  }}
                                  className="text-pink-600 hover:text-pink-700"
                                >
                                  {clientWeddings.length} свадьба(и)
                                </button>
                              ) : (
                                'Нет свадеб'
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-gray-500">Клиентов пока нет</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'wedding-details' && selectedWedding && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <button
                  onClick={() => setViewMode('weddings')}
                  className="text-sm text-gray-600 hover:text-gray-800 mb-2"
                >
                  ← Назад к списку свадеб
                </button>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedWedding.couple_name_1_ru} & {selectedWedding.couple_name_2_ru}
                </h2>
              </div>
              <button
                onClick={() => handleEditWedding(selectedWedding)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Редактировать свадьбу
              </button>
            </div>

            {/* Wedding Info */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Информация о свадьбе</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Дата свадьбы</p>
                  <p className="text-base font-medium">
                    {new Date(selectedWedding.wedding_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Страна</p>
                  <p className="text-base font-medium">{selectedWedding.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Место</p>
                  <p className="text-base font-medium">{selectedWedding.venue}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Количество гостей</p>
                  <p className="text-base font-medium">{selectedWedding.guest_count}</p>
                </div>
                {selectedWedding.client && (
                  <div>
                    <p className="text-sm text-gray-600">Клиент</p>
                    <p className="text-base font-medium">{selectedWedding.client.name}</p>
                    <p className="text-sm text-gray-500">{selectedWedding.client.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Задачи</h3>
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm"
                >
                  + Добавить задачу
                </button>
              </div>
              {selectedWedding.tasks && selectedWedding.tasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
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
                          {task.due_date && (
                            <span className="text-xs text-gray-500">
                              До: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-800 mt-2">{task.title}</h4>
                        {task.link && task.link_text && (
                          <a
                            href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pink-600 hover:text-pink-700 mt-1 inline-block"
                          >
                            {task.link_text} →
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Задач пока нет</p>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Документы</h3>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm"
                >
                  + Добавить документ
                </button>
              </div>
              {selectedWedding.documents && selectedWedding.documents.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-800">{doc.name}</h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              Закреплен
                            </span>
                          )}
                        </div>
                        {doc.link && (
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pink-600 hover:text-pink-700 mt-1 inline-block"
                          >
                            Открыть ссылку →
                          </a>
                        )}
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-pink-600 hover:text-pink-700 mt-1 inline-block"
                          >
                            Скачать →
                          </a>
                        )}
                        {doc.file_size && (
                          <p className="text-xs text-gray-500 mt-1">
                            Размер: {(doc.file_size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Документов пока нет</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Wedding Modal */}
      {showWeddingModal && (
        <WeddingModal
          wedding={editingWedding}
          clients={clients}
          onClose={() => {
            setShowWeddingModal(false);
            setEditingWedding(null);
          }}
          onSave={handleSaveWedding}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && selectedWedding && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}

      {/* Document Modal */}
      {showDocumentModal && selectedWedding && (
        <DocumentModal
          document={editingDocument}
          weddingId={selectedWedding.id}
          onClose={() => {
            setShowDocumentModal(false);
            setEditingDocument(null);
          }}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  );
};

// Wedding Modal Component
interface WeddingModalProps {
  wedding: Wedding | null;
  clients: User[];
  onClose: () => void;
  onSave: (data: Omit<Wedding, 'id' | 'created_at' | 'updated_at'>) => void;
}

const WeddingModal = ({ wedding, clients, onClose, onSave }: WeddingModalProps) => {
  const [formData, setFormData] = useState({
    client_id: wedding?.client_id || '',
    couple_name_1_en: wedding?.couple_name_1_en || '',
    couple_name_1_ru: wedding?.couple_name_1_ru || '',
    couple_name_2_en: wedding?.couple_name_2_en || '',
    couple_name_2_ru: wedding?.couple_name_2_ru || '',
    wedding_date: wedding?.wedding_date || '',
    country: wedding?.country || '',
    venue: wedding?.venue || '',
    guest_count: wedding?.guest_count || 0,
    chat_link: wedding?.chat_link || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Omit<Wedding, 'id' | 'created_at' | 'updated_at'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {wedding ? 'Редактировать свадьбу' : 'Создать свадьбу'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Клиент *
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                disabled={!!wedding}
              >
                <option value="">Выберите клиента</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя партнера 1 (EN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя партнера 1 (RU) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя партнера 2 (EN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя партнера 2 (RU) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата свадьбы *
              </label>
              <input
                type="date"
                required
                value={formData.wedding_date}
                onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Страна *
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Место празднования *
              </label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество гостей *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.guest_count}
                onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка на чат с организатором
              </label>
              <input
                type="url"
                value={formData.chat_link}
                onChange={(e) => setFormData({ ...formData, chat_link: e.target.value })}
                placeholder="https://t.me/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
              >
                {wedding ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Task Modal Component
interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
}

const TaskModal = ({ task, onClose, onSave }: TaskModalProps) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    link: task?.link || '',
    link_text: task?.link_text || '',
    due_date: task?.due_date || '',
    status: (task?.status || 'pending') as 'pending' | 'in_progress' | 'completed',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      wedding_id: '', // Будет добавлено в родительском компоненте
    } as Omit<Task, 'id' | 'created_at' | 'updated_at'>);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {task ? 'Редактировать задачу' : 'Создать задачу'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название задачи *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="pending">Ожидает</option>
                <option value="in_progress">В работе</option>
                <option value="completed">Выполнено</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Срок выполнения
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка (опционально)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст ссылки (опционально)
              </label>
              <input
                type="text"
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                placeholder="Нажмите здесь"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
              >
                {task ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Document Modal Component
interface DocumentModalProps {
  document: Document | null;
  weddingId: string;
  onClose: () => void;
  onSave: (
    data: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>,
    file?: File
  ) => void;
}

const DocumentModal = ({ document, weddingId, onClose, onSave }: DocumentModalProps) => {
  const [formData, setFormData] = useState({
    name: document?.name || '',
    link: document?.link || '',
    pinned: document?.pinned || false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'> = {
      wedding_id: weddingId,
      name: formData.name,
      pinned: formData.pinned,
      ...(formData.link && { link: formData.link }),
    };

    // Если есть ссылка, используем её
    if (formData.link) {
      onSave(docData);
      return;
    }

    // Если нет файла, требуем его или ссылку
    if (!file && !document) {
      alert('Пожалуйста, выберите файл или укажите ссылку');
      return;
    }

    // Если редактируем документ без файла, только обновляем данные
    if (document && !file) {
      onSave(docData);
      return;
    }

    // Если есть файл, используем его
    if (file) {
      setUploading(true);
      try {
        onSave(docData, file);
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('Ошибка при загрузке документа');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {document ? 'Редактировать документ' : 'Создать документ'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название документа *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка на документ (Google Docs/Sheets/Drive) или файл
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://docs.google.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 mb-2"
              />
              <p className="text-xs text-gray-500 mb-2">или</p>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                disabled={!!formData.link}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="pinned"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="pinned" className="ml-2 block text-sm text-gray-700">
                Закрепить документ
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : document ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
