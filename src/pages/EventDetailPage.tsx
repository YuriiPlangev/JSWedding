import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weddingService, taskService, documentService, clientService, presentationService } from '../services/weddingService';
import type { Wedding, Task, Document, User } from '../types';
import { TaskModal, DocumentModal, PresentationModal } from '../components/modals';
import Header from '../components/Header';

interface SelectedWedding extends Wedding {
  client?: User;
  tasks?: Task[];
  documents?: Document[];
}

const EventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ru' | 'ua'>('ru');
  const [event, setEvent] = useState<SelectedWedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для модальных окон
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  
  // Состояния для drag and drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) {
        setError('ID ивента не указан');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Используем RPC функцию для главного организатора, чтобы обойти RLS
        const wedding = await weddingService.getWeddingById(eventId, true);
        if (!wedding) {
          setError('Ивент не найден');
          setLoading(false);
          return;
        }

        const client = await clientService.getClientById(wedding.client_id);
        const [tasks, documents] = await Promise.all([
          taskService.getWeddingTasks(eventId, true, true), // useRpc = true для главного организатора
          documentService.getWeddingDocuments(eventId, true, true), // useRpc = true для главного организатора
        ]);

        const weddingData: SelectedWedding = {
          ...wedding,
          client: client || undefined,
          tasks,
          documents,
        };

        setEvent(weddingData);
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Ошибка при загрузке ивента');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const loadEventDetails = async () => {
    if (!eventId || !event) return;
    
    try {
      const wedding = await weddingService.getWeddingById(eventId, true);
      if (!wedding) return;

      const client = await clientService.getClientById(wedding.client_id);
      const [tasks, documents] = await Promise.all([
        taskService.getWeddingTasks(eventId, true, true), // useRpc = true для главного организатора
        documentService.getWeddingDocuments(eventId, true, true), // useRpc = true для главного организатора
      ]);

      const weddingData: SelectedWedding = {
        ...wedding,
        client: client || undefined,
        tasks,
        documents,
      };

      setEvent(weddingData);
    } catch (err) {
      console.error('Error reloading event:', err);
      setError('Ошибка при перезагрузке данных');
    }
  };

  // Обработчики для заданий
  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'wedding_id'>) => {
    if (!event) return;

    try {
      const taskToSave: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        wedding_id: event.id,
        organizer_id: null,
        task_group_id: null,
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
        const result = await taskService.updateTask(editingTask.id, taskToSave, event.id);
        if (!result) {
          setError('Не удалось обновить задание');
          return;
        }
      } else {
        const existingTasks = event.tasks || [];
        const hasOrderColumn = existingTasks.some(task => task.order !== null && task.order !== undefined);
        if (hasOrderColumn) {
          const maxOrder = existingTasks.reduce((max, task) => {
            const order = task.order ?? -1;
            return order > max ? order : max;
          }, -1);
          taskToSave.order = maxOrder + 1;
        }
        
        const result = await taskService.createTask(taskToSave);
        if (!result) {
          setError('Не удалось создать задание');
          return;
        }
      }

      setShowTaskModal(false);
      setEditingTask(null);
      await loadEventDetails();
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Ошибка при сохранении задания');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!event) return;

    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
      return;
    }

    try {
      const success = await taskService.deleteTask(taskId, event.id);
      if (success) {
        await loadEventDetails();
      } else {
        setError('Не удалось удалить задание');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Ошибка при удалении задания');
    }
  };

  // Обработчики drag and drop для заданий
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', taskId);
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clone = target.cloneNode(true) as HTMLElement;
    
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.opacity = '1';
    clone.style.pointerEvents = 'none';
    
    document.body.appendChild(clone);
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    e.dataTransfer.setDragImage(clone, offsetX, offsetY);
    
    requestAnimationFrame(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    });
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!event || !draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      return;
    }

    const tasks = event.tasks || [];
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTaskId(null);
      return;
    }

    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    const taskOrders = newTasks.map((task, index) => ({
      id: task.id,
      order: index,
    }));

    try {
      const success = await taskService.updateTasksOrder(event.id, taskOrders);
      if (success) {
        await loadEventDetails();
      } else {
        setError('Не удалось обновить порядок заданий');
      }
    } catch (err) {
      console.error('Error updating tasks order:', err);
      setError('Ошибка при обновлении порядка заданий');
    }

    setDraggedTaskId(null);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
  };

  // Обработчики для документов
  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentModal(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowDocumentModal(true);
  };

  const handleSaveDocument = async (
    docData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'file_url'>
  ) => {
    if (!event) return;

    try {
      let result: Document | null = null;
      
      if (editingDocument) {
        result = await documentService.updateDocument(editingDocument.id, docData, event.id);
      } else {
        const existingDocuments = event.documents || [];
        const hasOrderColumn = existingDocuments.some(doc => doc.order !== null && doc.order !== undefined);
        if (hasOrderColumn) {
          const isPinned = docData.pinned === true;
          const sameGroupDocs = existingDocuments.filter(d => d.pinned === isPinned);
          const maxOrder = sameGroupDocs.reduce((max, doc) => {
            const order = doc.order ?? -1;
            return order > max ? order : max;
          }, -1);
          docData.order = maxOrder + 1;
        }
        
        result = await documentService.createDocument(docData);
      }

      if (!result) {
        setError('Ошибка при сохранении документа');
        return;
      }

      setShowDocumentModal(false);
      setEditingDocument(null);
      await loadEventDetails();
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Ошибка при сохранении документа');
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!event) return;

    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const success = await documentService.deleteDocument(
        document.id,
        undefined,
        event.id
      );
      if (success) {
        await loadEventDetails();
      } else {
        setError('Не удалось удалить документ');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Ошибка при удалении документа');
    }
  };

  // Обработчики drag and drop для документов
  const handleDocumentDragStart = (e: React.DragEvent, documentId: string) => {
    setDraggedDocumentId(documentId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', documentId);
  };

  const handleDocumentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDocumentDrop = async (e: React.DragEvent, targetDocumentId: string) => {
    e.preventDefault();
    if (!event || !draggedDocumentId || draggedDocumentId === targetDocumentId) {
      setDraggedDocumentId(null);
      return;
    }

    const documents = event.documents || [];
    const draggedDoc = documents.find(d => d.id === draggedDocumentId);
    const targetDoc = documents.find(d => d.id === targetDocumentId);

    if (!draggedDoc || !targetDoc) {
      setDraggedDocumentId(null);
      return;
    }

    const pinnedDocs = documents.filter(d => d.pinned);
    const unpinnedDocs = documents.filter(d => !d.pinned);

    let targetArray: Document[];
    let draggedIndex: number;
    let targetIndex: number;

    if (draggedDoc.pinned) {
      targetArray = pinnedDocs;
      draggedIndex = pinnedDocs.findIndex(d => d.id === draggedDocumentId);
      targetIndex = pinnedDocs.findIndex(d => d.id === targetDocumentId);
    } else {
      targetArray = unpinnedDocs;
      draggedIndex = unpinnedDocs.findIndex(d => d.id === draggedDocumentId);
      targetIndex = unpinnedDocs.findIndex(d => d.id === targetDocumentId);
    }

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedDocumentId(null);
      return;
    }

    const newArray = [...targetArray];
    const [draggedItem] = newArray.splice(draggedIndex, 1);
    newArray.splice(targetIndex, 0, draggedItem);

    const documentOrders = newArray.map((doc, index) => ({
      id: doc.id,
      order: index,
    }));

    try {
      const success = await documentService.updateDocumentsOrder(event.id, documentOrders);
      if (success) {
        await loadEventDetails();
      } else {
        setError('Не удалось обновить порядок документов');
      }
    } catch (err) {
      console.error('Error updating documents order:', err);
      setError('Ошибка при обновлении порядка документов');
    }

    setDraggedDocumentId(null);
  };

  const handleDocumentDragEnd = () => {
    setDraggedDocumentId(null);
  };

  // Обработчики для презентации
  const handleDeletePresentation = async () => {
    if (!event) return;

    if (!confirm('Вы уверены, что хотите удалить эту презентацию?')) {
      return;
    }

    try {
      const success = await presentationService.deletePresentation(event.id);
      if (success) {
        await loadEventDetails();
      } else {
        setError('Не удалось удалить презентацию');
      }
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError('Ошибка при удалении презентации');
    }
  };

  const handleUploadPresentation = async (data: {
    title: string;
    pdfFile: File;
    sections: Array<{ title: string; page_number: number }>;
  }) => {
    if (!event) return;

    setUploadingPresentation(true);
    try {
      // TODO: Реализовать загрузку PDF и конвертацию в изображения
      console.log('Uploading presentation:', data);
      
      setShowPresentationModal(false);
    } catch (err) {
      console.error('Error uploading presentation:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setUploadingPresentation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eae6db] flex items-center justify-center">
        <div className="text-black font-forum">Загрузка...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#eae6db]">
        <Header
          onLogout={logout}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-4">
            <button
              onClick={() => navigate('/main-organizer')}
              className="text-blue-600 hover:text-blue-800 font-forum"
            >
              ← Назад к списку ивентов
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-forum">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#eae6db]">
      <Header
        onLogout={logout}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 lg:px-12 xl:px-[60px] py-4 sm:py-5 md:py-6 lg:py-8 font-forum">
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

        <div className="mb-4 sm:mb-5 md:mb-6">
          <button
            onClick={() => navigate('/main-organizer')}
            className="text-[16px] sm:text-[18px] max-[1599px]:text-[16px] font-forum text-[#00000080] hover:text-black transition-colors mb-2 cursor-pointer"
          >
            ← Назад к списку ивентов
          </button>
          <h2 className="text-[28px] sm:text-[32px] md:text-[36px] lg:text-[54px] max-[1599px]:text-[40px] lg:max-[1599px]:text-[36px] min-[1300px]:max-[1599px]:text-[42px] font-forum font-bold leading-tight text-black break-words">
            {event.project_name || `${event.couple_name_1_ru || event.couple_name_1_en || ''} & ${event.couple_name_2_ru || event.couple_name_2_en || ''}`}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Wedding Info */}
          <div className="bg-white border border-[#00000033] rounded-lg p-4 sm:p-5 md:p-6">
            <h3 className="text-[20px] sm:text-[22px] md:text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-3 sm:mb-4">Информация об ивенте</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дата свадьбы</p>
                <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                  {new Date(event.wedding_date).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div>
                <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дней до свадьбы</p>
                <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const wedding = new Date(event.wedding_date);
                    wedding.setHours(0, 0, 0, 0);
                    const diffTime = wedding.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays > 0 ? diffDays : (diffDays === 0 ? 0 : 'Прошло');
                  })()}
                </p>
              </div>
              <div>
                <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Страна</p>
                <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                  {event.country_ru || event.country || event.country_en || event.country_ua || ''}
                </p>
              </div>
              <div>
                <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Место</p>
                <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">{event.venue}</p>
              </div>
              <div>
                <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Количество гостей</p>
                <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{event.guest_count}</p>
              </div>
              {event.client && (
                <div>
                  <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Клиент</p>
                  <p className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{event.client.name}</p>
                  <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080] mt-1">{event.client.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Notes */}
          {event.notes && (
            <div className="bg-white border border-[#00000033] rounded-lg p-6">
              <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-4">Заметки клиента</h3>
              <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-light text-black whitespace-pre-wrap">
                  {event.notes}
                </p>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="bg-white border border-[#00000033] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Задания</h3>
                <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                  Перетащите элементы для изменения порядка
                </p>
              </div>
              <button
                onClick={handleCreateTask}
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
              >
                + Добавить задание
              </button>
            </div>
            {event.tasks && event.tasks.length > 0 ? (
              <div className="space-y-3">
                {event.tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task.id)}
                    onDragOver={handleTaskDragOver}
                    onDrop={(e) => handleTaskDrop(e, task.id)}
                    onDragEnd={handleTaskDragEnd}
                    className="border border-[#00000033] rounded-lg p-4 flex justify-between items-start hover:shadow-md transition cursor-move"
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <div className="text-[#00000040] mt-1 cursor-move select-none">⋮⋮</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-[14px] rounded-full font-forum ${
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
                              ? 'В процессе'
                              : 'Ожидает'}
                          </span>
                        </div>
                        <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-2">
                          {task.title_ru || task.title || task.title_en || task.title_ua || ''}
                        </h4>
                        {task.link && (() => {
                          const linkText = task.link_text_ru || task.link_text || task.link_text_en || task.link_text_ua;
                          
                          return linkText ? (
                            <a
                              href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[16px] max-[1599px]:text-[15px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                            >
                              {linkText} →
                            </a>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[18px] font-forum font-light text-[#00000080]">Задач пока нет</p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white border border-[#00000033] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Документы</h3>
                <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                  Перетащите элементы для изменения порядка (закрепленные и незакрепленные отдельно)
                </p>
              </div>
              <button
                onClick={handleCreateDocument}
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
              >
                + Добавить документ
              </button>
            </div>
            {event.documents && event.documents.length > 0 ? (
              <div className="space-y-3">
                {event.documents.map((doc) => (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={(e) => handleDocumentDragStart(e, doc.id)}
                    onDragOver={handleDocumentDragOver}
                    onDrop={(e) => handleDocumentDrop(e, doc.id)}
                    onDragEnd={handleDocumentDragEnd}
                    className={`border border-[#00000033] rounded-lg p-4 flex justify-between items-center hover:shadow-md transition cursor-move ${
                      draggedDocumentId === doc.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-[#00000040] cursor-move select-none">⋮⋮</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black">
                            {doc.name_ru || doc.name || doc.name_en || doc.name_ua || ''}
                          </h4>
                          {doc.pinned && (
                            <span className="px-2 py-1 text-[14px] font-forum bg-yellow-100 text-yellow-800 rounded">
                              Закреплено
                            </span>
                          )}
                        </div>
                        {doc.link && (
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[16px] max-[1599px]:text-[15px] font-forum text-black hover:underline mt-1 inline-block cursor-pointer"
                          >
                            Открыть ссылку
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEditDocument(doc)}
                        className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer text-[16px] font-forum"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[18px] font-forum font-light text-[#00000080]">Нет документов</p>
            )}
          </div>

          {/* Presentation */}
          <div className="bg-white border border-[#00000033] rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Презентация</h3>
              <div className="flex gap-2">
                {event.presentation && event.presentation.type === 'wedding' && (
                  <button
                    onClick={handleDeletePresentation}
                    className="px-4 md:px-6 py-2 md:py-3 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                  >
                    Удалить презентацию
                  </button>
                )}
                <button
                  onClick={() => setShowPresentationModal(true)}
                  className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  {event.presentation && event.presentation.type === 'wedding' 
                    ? 'Изменить презентацию' 
                    : 'Загрузить презентацию'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                {event.presentation && event.presentation.type === 'wedding' 
                  ? `Тип: Презентация свадьбы - "${event.presentation.title}"`
                  : `Тип: Стандартная презентация компании`}
              </p>
              {event.presentation && event.presentation.sections && (
                <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                  Секций: {event.presentation.sections.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && event && (
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
      {showDocumentModal && event && (
        <DocumentModal
          document={editingDocument}
          weddingId={event.id}
          onClose={() => {
            setShowDocumentModal(false);
            setEditingDocument(null);
          }}
          onSave={handleSaveDocument}
        />
      )}

      {/* Presentation Modal */}
      {showPresentationModal && event && (
        <PresentationModal
          onClose={() => setShowPresentationModal(false)}
          onUpload={handleUploadPresentation}
          uploading={uploadingPresentation}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
