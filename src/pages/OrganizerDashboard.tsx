import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, Document, User, Presentation } from '../types';
// import ProjectsCalendar from '../components/ProjectsCalendar';

type ViewMode = 'overview' | 'weddings' | 'clients' | 'wedding-details';

interface SelectedWedding extends Wedding {
  client?: User;
  tasks?: Task[];
  documents?: Document[];
}

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [editingWedding, setEditingWedding] = useState<Wedding | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);

  const loadData = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && user.role === 'organizer') {
      loadData();
    } else if (user && user.role !== 'organizer') {
      // Если пользователь не организатор, перенаправляем
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, loadData]);

  const loadWeddingDetails = async (weddingId: string) => {
    setLoading(true);
    try {
      const wedding = await weddingService.getWeddingById(weddingId);
      if (!wedding) {
        setError('Проект не найден');
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
      setError('Ошибка при загрузке деталей проекта');
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
    if (!confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) {
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
        setError('Не удалось удалить проект');
      }
    } catch (err) {
      console.error('Error deleting wedding:', err);
      setError('Ошибка при удалении проекта');
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
      // Подготавливаем данные для сохранения
      const taskToSave: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        wedding_id: selectedWedding.id,
        title: taskData.title.trim(),
        status: taskData.status,
        ...(taskData.due_date && taskData.due_date.trim() && { due_date: taskData.due_date }),
        ...(taskData.link && taskData.link.trim() && { link: taskData.link.trim() }),
        ...(taskData.link_text && taskData.link_text.trim() && { link_text: taskData.link_text.trim() }),
      };

      if (editingTask) {
        const result = await taskService.updateTask(editingTask.id, taskToSave, selectedWedding.id);
        if (!result) {
          setError('Не удалось обновить задачу. Проверьте подключение к интернету и попробуйте снова.');
          return;
        }
      } else {
        const result = await taskService.createTask(taskToSave);
        if (!result) {
          setError('Не удалось создать задачу. Проверьте подключение к интернету и попробуйте снова.');
          return;
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Ошибка при сохранении задачи. Попробуйте еще раз.');
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
        undefined, // file_path больше не используется
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

  // Обработчики для презентации
  const handleDeletePresentation = async () => {
    if (!selectedWedding) return;

    if (!confirm('Вы уверены, что хотите удалить презентацию свадьбы? После удаления будет показана презентация компании по умолчанию.')) {
      return;
    }

    try {
      const success = await presentationService.deletePresentation(selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError('Не удалось удалить презентацию');
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError('Ошибка при удалении презентации');
    }
  };

  const handleUploadPresentation = async (files: FileList | null) => {
    if (!selectedWedding || !files || files.length === 0) return;

    setUploadingPresentation(true);
    try {
      const defaultPresentation = presentationService.getDefaultCompanyPresentation();
      const sections: Presentation['sections'] = [];

      // Загружаем изображения для каждой секции
      for (let i = 0; i < Math.min(files.length, defaultPresentation.sections.length); i++) {
        const file = files[i];
        const imageUrl = await presentationService.uploadPresentationImage(
          selectedWedding.id,
          file,
          i
        );

        if (imageUrl) {
          sections.push({
            id: i,
            name: defaultPresentation.sections[i].name,
            image_url: imageUrl,
          });
        }
      }

      // Если загружено меньше файлов, чем секций, заполняем остальные пустыми
      for (let i = files.length; i < defaultPresentation.sections.length; i++) {
        sections.push({
          id: i,
          name: defaultPresentation.sections[i].name,
          image_url: '',
        });
      }

      const presentation: Presentation = {
        type: 'wedding',
        title: `Презентация ${selectedWedding.couple_name_1_ru} & ${selectedWedding.couple_name_2_ru}`,
        sections,
      };

      const success = await presentationService.updatePresentation(selectedWedding.id, presentation);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
        setShowPresentationModal(false);
      } else {
        setError('Не удалось загрузить презентацию');
      }
    } catch (err) {
      console.error('Error uploading presentation:', err);
      setError('Ошибка при загрузке презентации');
    } finally {
      setUploadingPresentation(false);
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
      let result: Document | null = null;
      
      if (editingDocument) {
        result = await documentService.updateDocument(editingDocument.id, docData, selectedWedding.id, file);
      } else {
        result = await documentService.createDocument(docData, file);
      }

      if (!result) {
        setError('Не удалось сохранить документ. Проверьте подключение к интернету и попробуйте снова.');
        return;
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Ошибка при сохранении документа. Попробуйте еще раз.');
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
    <div className="min-h-screen bg-[#FBF9F5]">
      {/* Header */}
      <header className="bg-[#FBF9F5] border-b border-[#00000033]">
        <div className="px-4 md:px-8 lg:px-12 xl:px-[60px] py-4 md:py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[32px] max-[1599px]:text-[24px] lg:max-[1599px]:text-[22px] min-[1300px]:max-[1599px]:text-[26px] font-forum leading-tight text-black">Панель организатора</h1>
              <p className="text-[16px] max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] leading-tight mt-1">Добро пожаловать, {user?.name}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 md:px-6 py-2 md:py-3 text-[16px] max-[1599px]:text-[14px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer border border-[#00000033] rounded-lg hover:bg-white"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#FBF9F5] border-b border-[#00000033]">
        <div className="px-4 md:px-8 lg:px-12 xl:px-[60px]">
          <div className="flex space-x-6 md:space-x-8">
            <button
              onClick={() => setViewMode('overview')}
              className={`py-4 px-1 border-b-2 font-forum text-[16px] max-[1599px]:text-[14px] transition-colors cursor-pointer ${
                viewMode === 'overview'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Обзор
            </button>
            <button
              onClick={() => setViewMode('weddings')}
              className={`py-4 px-1 border-b-2 font-forum text-[16px] max-[1599px]:text-[14px] transition-colors cursor-pointer ${
                viewMode === 'weddings'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Проекты ({weddings.length})
            </button>
            {viewMode === 'wedding-details' && selectedWedding && (
              <button
                className="py-4 px-1 border-b-2 font-forum text-[16px] max-[1599px]:text-[14px] border-black text-black cursor-pointer"
              >
                {selectedWedding.couple_name_1_ru} & {selectedWedding.couple_name_2_ru}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-4 md:px-8 lg:px-12 xl:px-[60px] py-6 md:py-8 font-forum">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-forum">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-forum cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {viewMode === 'overview' && (
          <div>
            <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black mb-6">Обзор</h2>
            
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-md transition">
                <div className="text-[36px] max-[1599px]:text-[28px] font-forum font-bold text-black">{stats.totalWeddings}</div>
                <div className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mt-1">Всего проектов</div>
              </div>
              <div className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-md transition">
                <div className="text-[36px] max-[1599px]:text-[28px] font-forum font-bold text-black">{stats.completedTasks}</div>
                <div className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mt-1">Выполненных задач</div>
              </div>
              <div className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-md transition">
                <div className="text-[36px] max-[1599px]:text-[28px] font-forum font-bold text-black">
                  {stats.totalTasks - stats.completedTasks}
                </div>
                <div className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mt-1">Задач в работе</div>
              </div>
            </div>

            {/* Calendar */}
            {/* <div className="mb-8">
              <div className="bg-white border border-[#00000033] rounded-lg p-6">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-4">Календарь проектов</h3>
                <ProjectsCalendar weddings={weddings} onDateClick={(weddingId: string) => loadWeddingDetails(weddingId)} />
              </div>
            </div> */}

            {/* Recent Weddings */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">Последние проекты</h3>
                <button
                  onClick={() => setViewMode('weddings')}
                  className="text-[16px] max-[1599px]:text-[14px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer"
                >
                  Смотреть все →
                </button>
              </div>
              {weddings.slice(0, 5).length > 0 ? (
                <div className="space-y-4">
                  {weddings.slice(0, 5).map((wedding) => (
                    <div
                      key={wedding.id}
                      className="border border-[#00000033] rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => loadWeddingDetails(wedding.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black">
                            {wedding.couple_name_1_ru} & {wedding.couple_name_2_ru}
                          </h4>
                          <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mt-1">
                            {new Date(wedding.wedding_date).toLocaleDateString('ru-RU')} • {wedding.venue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">Нет свадеб</p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'weddings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black">Проекты</h2>
              <button
                onClick={handleCreateWedding}
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                + Добавить проект
              </button>
            </div>

            {weddings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {weddings.map((wedding) => (
                  <div
                    key={wedding.id}
                    className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mb-2">
                          {wedding.couple_name_1_ru} & {wedding.couple_name_2_ru}
                        </h3>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                          Дата: {new Date(wedding.wedding_date).toLocaleDateString('ru-RU')}
                        </p>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Место: {wedding.venue}</p>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Гостей: {wedding.guest_count}</p>
                        {wedding.chat_link && (
                          <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-black mt-1">
                            <a href={wedding.chat_link} target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">
                              Чат: {wedding.chat_link.length > 30 ? wedding.chat_link.substring(0, 30) + '...' : wedding.chat_link}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => loadWeddingDetails(wedding.id)}
                        className="flex-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] font-forum"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={() => handleEditWedding(wedding)}
                        className="px-3 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteWedding(wedding.id)}
                        className="px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
              <div className="bg-white border border-[#00000033] rounded-lg p-12 text-center">
                <p className="text-[16px] font-forum font-light text-[#00000080] mb-4">У вас пока нет проектов</p>
                <button
                  onClick={handleCreateWedding}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  Создать первый проект
                </button>
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
                  className="text-[16px] max-[1599px]:text-[14px] font-forum text-[#00000080] hover:text-black transition-colors mb-2 cursor-pointer"
                >
                  ← Назад к списку проектов
                </button>
                <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black">
                  {selectedWedding.couple_name_1_ru} & {selectedWedding.couple_name_2_ru}
                </h2>
              </div>
              <button
                onClick={() => handleEditWedding(selectedWedding)}
                className="px-4 md:px-6 py-2 md:py-3 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                Редактировать проект
              </button>
            </div>

            {/* Wedding Info */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-4">Информация о проекте</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Дата свадьбы</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">
                    {new Date(selectedWedding.wedding_date).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Страна</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.country}</p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Место</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.venue}</p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Количество гостей</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.guest_count}</p>
                </div>
                {selectedWedding.client && (
                  <div>
                    <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">Клиент</p>
                    <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.client.name}</p>
                    <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mt-1">{selectedWedding.client.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Notes */}
            {selectedWedding.notes && (
              <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-4">Заметки клиента</h3>
                <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-black whitespace-pre-wrap">
                    {selectedWedding.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">Задачи</h3>
                <button
                  onClick={handleCreateTask}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  + Добавить задачу
                </button>
              </div>
              {selectedWedding.tasks && selectedWedding.tasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-[#00000033] rounded-lg p-4 flex justify-between items-start hover:shadow-md transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-[12px] rounded-full font-forum ${
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
                            <span className="text-[12px] font-forum font-light text-[#00000080]">
                              До: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-2">{task.title}</h4>
                        {task.link && task.link_text && (
                          <a
                            href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] max-[1599px]:text-[13px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                          >
                            {task.link_text} →
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">Задач пока нет</p>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">Документы</h3>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  + Добавить документ
                </button>
              </div>
              {selectedWedding.documents && selectedWedding.documents.length > 0 ? (
                <div className="space-y-3">
                  {selectedWedding.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-[#00000033] rounded-lg p-4 flex justify-between items-center hover:shadow-md transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black">{doc.name}</h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-[12px] font-forum bg-yellow-100 text-yellow-800 rounded">
                              Закреплен
                            </span>
                          )}
                        </div>
                        {doc.link && (
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] max-[1599px]:text-[13px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                          >
                            Открыть ссылку →
                          </a>
                        )}
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] max-[1599px]:text-[13px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                          >
                            Скачать →
                          </a>
                        )}
                        {doc.file_size && (
                          <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                            Размер: {doc.file_size < 1024 * 1024 
                              ? `${(doc.file_size / 1024).toFixed(2)} KB`
                              : `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        )}
                        {doc.mime_type && (
                          <p className="text-[12px] font-forum font-light text-[#00000080]">
                            Тип: {doc.mime_type}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">Документов пока нет</p>
              )}
            </div>

            {/* Presentation */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">Презентация</h3>
                <div className="flex gap-2">
                  {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' && (
                    <button
                      onClick={handleDeletePresentation}
                      className="px-4 md:px-6 py-2 md:py-3 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                    >
                      Удалить презентацию
                    </button>
                  )}
                  <button
                    onClick={() => setShowPresentationModal(true)}
                    className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                  >
                    {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                      ? 'Изменить презентацию' 
                      : 'Загрузить презентацию'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                  {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                    ? `Тип: Презентация свадьбы - "${selectedWedding.presentation.title}"`
                    : 'Тип: Презентация компании (по умолчанию)'}
                </p>
                {selectedWedding.presentation && selectedWedding.presentation.sections && (
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                    Секций: {selectedWedding.presentation.sections.length}
                  </p>
                )}
              </div>
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

      {/* Presentation Modal */}
      {showPresentationModal && selectedWedding && (
        <PresentationModal
          onClose={() => setShowPresentationModal(false)}
          onUpload={handleUploadPresentation}
          uploading={uploadingPresentation}
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
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {wedding ? 'Редактировать проект' : 'Создать проект'}
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Клиент *
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum cursor-pointer bg-white"
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
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Имя партнера 1 (EN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_en: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Имя партнера 1 (RU) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_1_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_1_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Имя партнера 2 (EN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_en}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_en: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Имя партнера 2 (RU) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.couple_name_2_ru}
                  onChange={(e) => setFormData({ ...formData, couple_name_2_ru: e.target.value })}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Дата свадьбы *
              </label>
              <input
                type="date"
                required
                value={formData.wedding_date}
                onChange={(e) => setFormData({ ...formData, wedding_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Страна *
              </label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Место празднования *
              </label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Количество гостей *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.guest_count}
                onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Ссылка на чат с организатором
              </label>
              <input
                type="url"
                value={formData.chat_link}
                onChange={(e) => setFormData({ ...formData, chat_link: e.target.value })}
                placeholder="https://t.me/..."
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#FBF9F5]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
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
    
    // Валидация: название задачи обязательно
    if (!formData.title.trim()) {
      return;
    }
    
    // Подготавливаем данные, убирая пустые опциональные поля
    const taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
      wedding_id: '', // Будет добавлено в родительском компоненте
      title: formData.title.trim(),
      status: formData.status,
      ...(formData.due_date && formData.due_date.trim() && { due_date: formData.due_date }),
      ...(formData.link && formData.link.trim() && { link: formData.link.trim() }),
      ...(formData.link_text && formData.link_text.trim() && { link_text: formData.link_text.trim() }),
    };
    
    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {task ? 'Редактировать задачу' : 'Создать задачу'}
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Название задачи *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum cursor-pointer bg-white"
              >
                <option value="pending">Ожидает</option>
                <option value="in_progress">В работе</option>
                <option value="completed">Выполнено</option>
              </select>
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Срок выполнения
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Ссылка (опционально)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Текст ссылки (опционально)
              </label>
              <input
                type="text"
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                placeholder="Нажмите здесь"
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#FBF9F5]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
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
  const [error, setError] = useState<string | null>(null);

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    setFormData({ ...formData, link });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Пожалуйста, укажите название документа');
      return;
    }

    const docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'> = {
      wedding_id: weddingId,
      name: formData.name.trim(),
      pinned: formData.pinned,
      ...(formData.link && formData.link.trim() && { link: formData.link.trim() }),
    };

    // Создаем/обновляем документ (только со ссылкой или без ссылки)
    try {
      await onSave(docData, undefined);
      onClose();
    } catch (err) {
      setError('Ошибка при сохранении документа');
      console.error('Error saving document:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {document ? 'Редактировать документ' : 'Создать документ'}
            </h2>
            <button onClick={onClose} className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Название документа *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
            </div>

            <div>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Ссылка на документ (Google Docs/Sheets/Drive) <span className="font-normal text-[#00000080]">(опционально)</span>
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={handleLinkChange}
                placeholder="https://docs.google.com/..."
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
              />
              <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                Укажите ссылку на документ в Google Docs, Google Sheets, Google Drive или другой сервис
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[14px] font-forum text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="pinned"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                className="h-4 w-4 text-black focus:ring-black border-[#00000033] rounded cursor-pointer"
              />
              <label htmlFor="pinned" className="ml-2 block text-[16px] max-[1599px]:text-[14px] font-forum text-black cursor-pointer">
                Закрепить документ
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2 md:py-3 border border-[#00000033] rounded-lg text-black hover:bg-white transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum bg-[#FBF9F5]"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                {document ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Модальное окно для загрузки презентации
interface PresentationModalProps {
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
}

const PresentationModal = ({ onClose, onUpload, uploading }: PresentationModalProps) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      // Проверяем, что выбрано не более 4 файлов
      if (selectedFiles.length > 4) {
        setError('Можно загрузить максимум 4 изображения');
        return;
      }
      // Проверяем типы файлов
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      for (let i = 0; i < selectedFiles.length; i++) {
        if (!validTypes.includes(selectedFiles[i].type)) {
          setError('Поддерживаются только изображения (JPEG, PNG, WebP)');
          return;
        }
      }
      setFiles(selectedFiles);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Пожалуйста, выберите изображения');
      return;
    }
    onUpload(files);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              Загрузить презентацию
            </h2>
            <button 
              onClick={onClose} 
              disabled={uploading}
              className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mb-4">
                Выберите до 4 изображений для презентации. Каждое изображение будет соответствовать одной секции презентации.
              </p>
              <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                Изображения (JPEG, PNG, WebP) *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {files && files.length > 0 && (
                <div className="mt-2">
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-black mb-2">
                    Выбрано файлов: {files.length}
                  </p>
                  <ul className="list-disc list-inside text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                    {Array.from(files).map((file, index) => (
                      <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-[14px] font-forum text-red-800">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={uploading || !files || files.length === 0}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
