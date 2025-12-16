import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, Document, User, Presentation } from '../types';
import { getTranslation } from '../utils/translations';
import { getInitialLanguage } from '../utils/languageUtils';
import { WeddingModal, TaskModal, DocumentModal, PresentationModal, ClientModal } from '../components/modals';

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
  
  // Получаем язык из localStorage или используем русский по умолчанию
  const currentLanguage = getInitialLanguage();
  const t = getTranslation(currentLanguage);

  // Состояния для модальных окон
  const [showWeddingModal, setShowWeddingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
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
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.loadError);
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
        const currentLang = getInitialLanguage();
        const translations = getTranslation(currentLang);
        setError(translations.organizer.loadError);
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
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWedding = async () => {
    setEditingWedding(null);
    // Обновляем список клиентов перед открытием формы
    if (user?.id) {
      try {
        const clientsData = await clientService.getAllClients();
        setClients(clientsData);
      } catch (err) {
        console.error('Error loading clients:', err);
      }
    }
    setShowWeddingModal(true);
  };

  const handleEditWedding = (wedding: Wedding) => {
    setEditingWedding(wedding);
    setShowWeddingModal(true);
  };

  const handleDeleteWedding = async (weddingId: string) => {
    if (!confirm(t.organizer.deleteProjectConfirm)) {
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
        setError(t.organizer.deleteError + ' ' + t.organizer.projects.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting wedding:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.projects.toLowerCase());
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

  const handleCreateClient = () => {
    setShowClientModal(true);
  };

  const handleSaveClient = async (clientData: { email: string; password: string }) => {
    try {
      await clientService.createClient(clientData.email, clientData.password);
      setShowClientModal(false);
      await loadData(); // Перезагружаем данные, чтобы обновить список клиентов
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Ошибка при создании клиента');
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
        ...(taskData.title_en?.trim() && { title_en: taskData.title_en.trim() }),
        ...(taskData.title_ru?.trim() && { title_ru: taskData.title_ru.trim() }),
        ...(taskData.title_ua?.trim() && { title_ua: taskData.title_ua.trim() }),
        ...(taskData.due_date && taskData.due_date.trim() && { due_date: taskData.due_date }),
        ...(taskData.link && taskData.link.trim() && { link: taskData.link.trim() }),
        ...(taskData.link_text && taskData.link_text.trim() && { link_text: taskData.link_text.trim() }),
        ...(taskData.link_text_en?.trim() && { link_text_en: taskData.link_text_en.trim() }),
        ...(taskData.link_text_ru?.trim() && { link_text_ru: taskData.link_text_ru.trim() }),
        ...(taskData.link_text_ua?.trim() && { link_text_ua: taskData.link_text_ua.trim() }),
      };

      if (editingTask) {
        const result = await taskService.updateTask(editingTask.id, taskToSave, selectedWedding.id);
        if (!result) {
          setError(t.organizer.updateError);
          return;
        }
      } else {
        const result = await taskService.createTask(taskToSave);
        if (!result) {
          setError(t.organizer.createError);
          return;
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving task:', err);
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedWedding) return;

    if (!confirm(t.organizer.deleteTaskConfirm)) {
      return;
    }

    try {
      const success = await taskService.deleteTask(taskId, selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError(t.organizer.deleteError + ' ' + t.organizer.tasks.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.tasks.toLowerCase());
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentModal(true);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!selectedWedding) return;

    if (!confirm(t.organizer.deleteDocumentConfirm)) {
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
        setError(t.organizer.deleteError + ' ' + t.organizer.documents.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.documents.toLowerCase());
    }
  };

  // Обработчики для презентации
  const handleDeletePresentation = async () => {
    if (!selectedWedding) return;

    if (!confirm(t.organizer.deletePresentationConfirm)) {
      return;
    }

    try {
      const success = await presentationService.deletePresentation(selectedWedding.id);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
      } else {
        setError(t.organizer.deleteError + ' ' + t.organizer.presentation.toLowerCase());
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError(t.organizer.deleteError + ' ' + t.organizer.presentation.toLowerCase());
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

      // Формируем название презентации в зависимости от языка
      const coupleName1 = currentLanguage === 'en' && selectedWedding.couple_name_1_en 
        ? selectedWedding.couple_name_1_en 
        : currentLanguage === 'ua' && selectedWedding.couple_name_1_ru 
        ? selectedWedding.couple_name_1_ru 
        : selectedWedding.couple_name_1_ru || selectedWedding.couple_name_1_en || '';
      const coupleName2 = currentLanguage === 'en' && selectedWedding.couple_name_2_en 
        ? selectedWedding.couple_name_2_en 
        : currentLanguage === 'ua' && selectedWedding.couple_name_2_ru 
        ? selectedWedding.couple_name_2_ru 
        : selectedWedding.couple_name_2_ru || selectedWedding.couple_name_2_en || '';
      
      const presentation: Presentation = {
        type: 'wedding',
        title: `${t.organizer.weddingPresentation}: ${coupleName1} & ${coupleName2}`,
        sections,
      };

      const success = await presentationService.updatePresentation(selectedWedding.id, presentation);
      if (success) {
        await loadWeddingDetails(selectedWedding.id);
        setShowPresentationModal(false);
      } else {
        setError(t.organizer.loadError);
      }
    } catch (err) {
      console.error('Error uploading presentation:', err);
      setError(t.organizer.loadError);
    } finally {
      setUploadingPresentation(false);
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowDocumentModal(true);
  };

  const handleSaveDocument = async (
    docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>
  ) => {
    if (!selectedWedding) return;

    try {
      let result: Document | null = null;
      
      if (editingDocument) {
        result = await documentService.updateDocument(editingDocument.id, docData, selectedWedding.id);
      } else {
        result = await documentService.createDocument(docData);
      }

      if (!result) {
        setError(t.organizer.saveError);
        return;
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadWeddingDetails(selectedWedding.id);
    } catch (err) {
      console.error('Error saving document:', err);
      const currentLang = getInitialLanguage();
      const translations = getTranslation(currentLang);
      setError(translations.organizer.saveError);
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
              {t.organizer.overview}
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
            <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black mb-6">{t.organizer.overview}</h2>
            
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-md transition">
                <div className="text-[36px] max-[1599px]:text-[28px] font-forum font-bold text-black">{stats.totalWeddings}</div>
                <div className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mt-1">Всего проектов</div>
              </div>
              <div className="bg-white border border-[#00000033] rounded-lg p-6 hover:shadow-md transition">
                <div className="text-[36px] max-[1599px]:text-[28px] font-forum font-bold text-black">{stats.totalClients}</div>
                <div className="text-[16px] max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mt-1">Клиентов</div>
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

            {/* Clients Section */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">Клиенты</h3>
                <button
                  onClick={handleCreateClient}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  + Создать клиента
                </button>
              </div>
              {clients.length > 0 ? (
                <div className="space-y-3">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="border border-[#00000033] rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black">
                            {client.name}
                          </h4>
                          <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mt-1">
                            {client.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">Клиентов пока нет</p>
              )}
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
                  {t.organizer.viewAll}
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
                            {currentLanguage === 'en' && wedding.couple_name_1_en && wedding.couple_name_2_en
                              ? `${wedding.couple_name_1_en} & ${wedding.couple_name_2_en}`
                              : currentLanguage === 'ua' && wedding.couple_name_1_ru && wedding.couple_name_2_ru
                              ? `${wedding.couple_name_1_ru} & ${wedding.couple_name_2_ru}`
                              : `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`}
                          </h4>
                          <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080] mt-1">
                            {new Date(wedding.wedding_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')} • {wedding.venue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">{t.organizer.noProjects}</p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'weddings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black">{t.organizer.projects}</h2>
              <button
                onClick={handleCreateWedding}
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                + {t.organizer.addProject}
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
                          {currentLanguage === 'en' && wedding.couple_name_1_en && wedding.couple_name_2_en
                            ? `${wedding.couple_name_1_en} & ${wedding.couple_name_2_en}`
                            : currentLanguage === 'ua' && wedding.couple_name_1_ru && wedding.couple_name_2_ru
                            ? `${wedding.couple_name_1_ru} & ${wedding.couple_name_2_ru}`
                            : `${wedding.couple_name_1_ru || wedding.couple_name_1_en || ''} & ${wedding.couple_name_2_ru || wedding.couple_name_2_en || ''}`}
                        </h3>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                          {t.organizer.weddingDate}: {new Date(wedding.wedding_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')}
                        </p>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.place}: {wedding.venue}</p>
                        <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.guestCount}: {wedding.guest_count}</p>
                        {wedding.chat_link && (
                          <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-black mt-1">
                            <a href={wedding.chat_link} target="_blank" rel="noopener noreferrer" className="hover:underline cursor-pointer">
                              {t.organizer.chat}: {wedding.chat_link.length > 30 ? wedding.chat_link.substring(0, 30) + '...' : wedding.chat_link}
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
                        {t.common.more}
                      </button>
                      <button
                        onClick={() => handleEditWedding(wedding)}
                        className="px-3 py-2 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                      >
                        {t.common.edit}
                      </button>
                      <button
                        onClick={() => handleDeleteWedding(wedding.id)}
                        className="px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
              <div className="bg-white border border-[#00000033] rounded-lg p-12 text-center">
                <p className="text-[16px] font-forum font-light text-[#00000080] mb-4">{t.organizer.noProjects}</p>
                <button
                  onClick={handleCreateWedding}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  {t.organizer.createFirstProject}
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
                  {t.organizer.backToProjects}
                </button>
                <h2 className="text-[50px] max-[1599px]:text-[36px] lg:max-[1599px]:text-[32px] min-[1300px]:max-[1599px]:text-[38px] font-forum leading-tight text-black">
                  {currentLanguage === 'en' && selectedWedding.couple_name_1_en && selectedWedding.couple_name_2_en
                    ? `${selectedWedding.couple_name_1_en} & ${selectedWedding.couple_name_2_en}`
                    : currentLanguage === 'ua' && selectedWedding.couple_name_1_ru && selectedWedding.couple_name_2_ru
                    ? `${selectedWedding.couple_name_1_ru} & ${selectedWedding.couple_name_2_ru}`
                    : `${selectedWedding.couple_name_1_ru || selectedWedding.couple_name_1_en || ''} & ${selectedWedding.couple_name_2_ru || selectedWedding.couple_name_2_en || ''}`}
                </h2>
              </div>
              <button
                onClick={() => handleEditWedding(selectedWedding)}
                className="px-4 md:px-6 py-2 md:py-3 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
              >
                {t.organizer.editProject}
              </button>
            </div>

            {/* Wedding Info */}
            <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
              <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black mb-4">{t.organizer.projectInfo}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.weddingDate}</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">
                    {new Date(selectedWedding.wedding_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.country}</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">
                    {currentLanguage === 'en' && selectedWedding.country_en ? selectedWedding.country_en :
                     currentLanguage === 'ru' && selectedWedding.country_ru ? selectedWedding.country_ru :
                     currentLanguage === 'ua' && selectedWedding.country_ua ? selectedWedding.country_ua :
                     selectedWedding.country || selectedWedding.country_en || selectedWedding.country_ru || selectedWedding.country_ua || ''}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.place}</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.venue}</p>
                </div>
                <div>
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.guestCount}</p>
                  <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-1">{selectedWedding.guest_count}</p>
                </div>
                {selectedWedding.client && (
                  <div>
                    <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">{t.organizer.client}</p>
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
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">{t.organizer.tasks}</h3>
                <button
                  onClick={handleCreateTask}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  + {t.organizer.addTask}
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
                              ? t.organizer.taskStatus.completed
                              : task.status === 'in_progress'
                              ? t.organizer.taskStatus.inProgress
                              : t.organizer.taskStatus.pending}
                          </span>
                          {task.due_date && (
                            <span className="text-[12px] font-forum font-light text-[#00000080]">
                              {t.organizer.dueDate}: {new Date(task.due_date).toLocaleDateString(currentLanguage === 'en' ? 'en-US' : currentLanguage === 'ua' ? 'uk-UA' : 'ru-RU')}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black mt-2">
                          {currentLanguage === 'en' && task.title_en ? task.title_en :
                           currentLanguage === 'ru' && task.title_ru ? task.title_ru :
                           currentLanguage === 'ua' && task.title_ua ? task.title_ua :
                           task.title || task.title_en || task.title_ru || task.title_ua || ''}
                        </h4>
                        {task.link && (() => {
                          // Выбираем текст ссылки в зависимости от текущего языка
                          const linkText = currentLanguage === 'ua' && task.link_text_ua 
                            ? task.link_text_ua 
                            : currentLanguage === 'ru' && task.link_text_ru 
                            ? task.link_text_ru 
                            : currentLanguage === 'en' && task.link_text_en 
                            ? task.link_text_en 
                            : task.link_text;
                          
                          return linkText ? (
                            <a
                              href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] max-[1599px]:text-[13px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                            >
                              {linkText} →
                            </a>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          {t.common.delete}
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
                <h3 className="text-[24px] max-[1599px]:text-[20px] font-forum font-bold text-black">{t.organizer.documents}</h3>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
                >
                  + {t.organizer.addDocument}
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
                          <h4 className="text-[18px] max-[1599px]:text-[16px] font-forum font-bold text-black">
                            {currentLanguage === 'en' && doc.name_en ? doc.name_en :
                             currentLanguage === 'ru' && doc.name_ru ? doc.name_ru :
                             currentLanguage === 'ua' && doc.name_ua ? doc.name_ua :
                             doc.name || doc.name_en || doc.name_ru || doc.name_ua || ''}
                          </h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-[12px] font-forum bg-yellow-100 text-yellow-800 rounded">
                              {t.organizer.pinned}
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
                            {t.organizer.openLink}
                          </a>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[14px] font-forum"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[16px] font-forum font-light text-[#00000080]">{t.organizer.noDocuments}</p>
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
                      {t.organizer.deletePresentation}
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
                    ? `${t.organizer.type}: ${t.organizer.weddingPresentation} - "${selectedWedding.presentation.title}"`
                    : `${t.organizer.type}: ${t.organizer.defaultCompanyPresentation}`}
                </p>
                {selectedWedding.presentation && selectedWedding.presentation.sections && (
                  <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000080]">
                    {t.organizer.sections}: {selectedWedding.presentation.sections.length}
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

      {/* Client Modal */}
      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default OrganizerDashboard;
