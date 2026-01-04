import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskService } from '../services/weddingService';
import { weddingService } from '../services/weddingService';
import type { User, Document, Wedding } from '../types';
import logoV3 from '../assets/logoV3.svg';
import { supabase } from '../lib/supabase';

type ViewMode = 'events' | 'tasks' | 'documents';

const MainOrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('events');
  const [currentLanguage] = useState<'en' | 'ru' | 'ua'>('ru');
  const [events, setEvents] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для создания заданий (inline)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Состояния для документов
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Загрузка ивентов и организаторов
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Loading events and organizers...');
        const [eventsData] = await Promise.all([
          weddingService.getAllWeddings(),
          getAllOrganizers()
        ]);
        console.log('Loaded events:', eventsData);
        setEvents(eventsData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(`Ошибка при загрузке данных: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Загрузка документов
  useEffect(() => {
    if (viewMode === 'documents') {
      loadDocuments();
    }
  }, [viewMode]);

  const getAllOrganizers = async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'organizer')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching organizers:', error);
        return [];
      }

      return (data || []).map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || '',
        role: 'organizer' as const,
        avatar: profile.avatar_url,
      }));
    } catch (err) {
      console.error('Error in getAllOrganizers:', err);
      return [];
    }
  };

  const loadDocuments = async () => {
    try {
      // Получаем все документы главного организатора (где wedding_id = null или специальное поле)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .is('wedding_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setError('Введите название задания');
      return;
    }

    try {
      const result = await taskService.createOrganizerTask({
        organizer_id: null, // null - задание видно всем организаторам
        task_group_id: null, // Несортированные задачи
        title: taskTitle.trim(),
        title_ru: taskTitle.trim(),
        status: 'pending',
        priority: taskPriority,
      });

      if (result) {
        setTaskTitle('');
        setTaskPriority('medium');
        setError(null);
      } else {
        setError('Не удалось создать задание');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Ошибка при создании задания');
    }
  };

  const handleSaveDocument = async () => {
    if (!documentName.trim()) {
      setError('Введите название документа');
      return;
    }

    try {
      if (editingDocument) {
        // Обновление документа
        const { error } = await supabase
          .from('documents')
          .update({
            name: documentName.trim(),
            name_ru: documentName.trim(),
            link: documentLink || undefined,
          })
          .eq('id', editingDocument.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating document:', error);
          setError('Не удалось обновить документ');
          return;
        }

        await loadDocuments();
        setShowDocumentModal(false);
        setEditingDocument(null);
        setDocumentName('');
        setDocumentLink('');
        setError(null);
      } else {
        // Создание документа
        const { error } = await supabase
          .from('documents')
          .insert({
            wedding_id: null, // Документы главного организатора не привязаны к свадьбе
            name: documentName.trim(),
            name_ru: documentName.trim(),
            link: documentLink || undefined,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating document:', error);
          setError('Не удалось создать документ');
          return;
        }

        await loadDocuments();
        setShowDocumentModal(false);
        setDocumentName('');
        setDocumentLink('');
        setError(null);
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Ошибка при сохранении документа');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        setError('Не удалось удалить документ');
        return;
      }

      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Ошибка при удалении документа');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eae6db] flex items-center justify-center">
        <div className="text-black font-forum">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#eae6db] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#eae6db] border-b border-[#00000033] flex-shrink-0">
        <div className="px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-3 sm:py-4 md:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src={logoV3} 
                alt="logo" 
                className="h-10 sm:h-12 md:h-14 lg:h-12 max-[1599px]:lg:h-11 min-[1600px]:lg:h-14 w-auto flex-shrink-0"
                style={{ display: 'block' }}
              />
              <div>
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] max-[1599px]:text-[28px] lg:max-[1599px]:text-[26px] min-[1300px]:max-[1599px]:text-[30px] font-forum leading-tight text-black">Панель главного организатора</h1>
                <p className="text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] lg:max-[1599px]:text-[15px] min-[1300px]:max-[1599px]:text-[16px] font-forum font-light text-[#00000080] leading-tight mt-1">Добро пожаловать, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum text-[#00000080] hover:text-black transition-colors cursor-pointer border border-[#00000033] rounded-lg hover:bg-white w-full sm:w-auto"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#eae6db] border-b border-[#00000033] overflow-x-auto flex-shrink-0">
        <div className="px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px]">
          <div className="flex space-x-4 sm:space-x-6 md:space-x-8 min-w-max">
            <button
              onClick={() => setViewMode('events')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'events'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Ивенты
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'tasks'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Задания
            </button>
            <button
              onClick={() => setViewMode('documents')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-forum text-[16px] sm:text-[18px] max-[1599px]:text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'documents'
                  ? 'border-black text-black'
                  : 'border-transparent text-[#00000080] hover:text-black hover:border-[#00000033]'
              }`}
            >
              Документы
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-4 sm:py-5 md:py-6 lg:py-8 font-forum">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-forum text-[16px]">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-[16px] text-red-600 hover:text-red-800 font-forum cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Вкладка ивентов */}
        {viewMode === 'events' && (
          <div>
            <h2 className="text-2xl font-forum font-bold mb-4">Все ивенты</h2>
            {events.length === 0 ? (
              <p className="text-gray-600">Нет ивентов</p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {events.map((event) => {
                    const eventName = event.project_name || 
                      `${currentLanguage === 'ru' ? event.couple_name_1_ru : event.couple_name_1_en} & ${currentLanguage === 'ru' ? event.couple_name_2_ru : event.couple_name_2_en}`;
                    return (
                      <li
                        key={event.id}
                        onClick={() => navigate(`/main-organizer/event/${event.id}`)}
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-forum font-medium text-gray-900">
                              {eventName}
                            </h3>
                            <p className="text-sm text-gray-500 font-forum mt-1">
                              {new Date(event.wedding_date).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                              {event.venue && ` • ${event.venue}`}
                            </p>
                          </div>
                          <div className="ml-4 text-gray-400">
                            →
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Вкладка заданий */}
        {viewMode === 'tasks' && (
          <div>
            <h2 className="text-2xl font-forum font-bold mb-4">Создание заданий для организаторов</h2>
            
            <div className="bg-white rounded-lg shadow p-6 mb-4">
              <p className="text-gray-600 mb-4">
                Созданные задания будут отображаться в блоке "Несортированные задачи" у всех организаторов.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Название задания</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (taskTitle.trim()) {
                          handleCreateTask();
                        }
                      }
                    }}
                    placeholder="Введите название задания..."
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px] max-[1599px]:text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Срочность</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px] max-[1599px]:text-[13px] cursor-pointer"
                  >
                    <option value="low">Низкая</option>
                    <option value="medium">Средняя</option>
                    <option value="high">Высокая</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={handleCreateTask}
                    disabled={!taskTitle.trim()}
                    className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Создать задание
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Вкладка документов */}
        {viewMode === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-forum font-bold">Документы</h2>
              <button
                onClick={() => {
                  setEditingDocument(null);
                  setDocumentName('');
                  setDocumentLink('');
                  setShowDocumentModal(true);
                  setError(null);
                }}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                + Добавить документ
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-gray-600">Нет документов</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-bold mb-2">{doc.name_ru || doc.name}</h3>
                    {doc.link && (
                      <a
                        href={doc.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Открыть ссылку
                      </a>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDocument(doc);
                          setDocumentName(doc.name_ru || doc.name || '');
                          setDocumentLink(doc.link || '');
                          setShowDocumentModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-1 text-sm bg-red-200 rounded hover:bg-red-300"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Модальное окно документа */}
        {showDocumentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">
                {editingDocument ? 'Редактировать документ' : 'Добавить документ'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Название документа *</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Введите название документа"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Ссылка (необязательно)</label>
                <input
                  type="text"
                  value={documentLink}
                  onChange={(e) => setDocumentLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveDocument}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  {editingDocument ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setEditingDocument(null);
                    setDocumentName('');
                    setDocumentLink('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainOrganizerDashboard;

