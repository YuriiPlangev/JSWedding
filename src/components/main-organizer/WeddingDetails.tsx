import type { Wedding, Task, Document, User } from '../../types';

interface SelectedWedding extends Wedding {
  client?: User;
  tasks?: Task[];
  documents?: Document[];
  presentation?: {
    type: 'company' | 'wedding';
    title?: string;
    sections?: Array<{ id: number; name: string; image_url: string }>;
  };
}

interface WeddingDetailsProps {
  selectedWedding: SelectedWedding;
  draggedDocumentId: string | null;
  onBack: () => void;
  onEditWedding: (wedding: SelectedWedding) => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string) => void;
  onTaskDragOver: (e: React.DragEvent) => void;
  onTaskDrop: (e: React.DragEvent, targetTaskId: string) => void;
  onTaskDragEnd: () => void;
  onCreateDocument: () => void;
  onEditDocument: (doc: Document) => void;
  onDeleteDocument: (doc: Document) => void;
  onDocumentDragStart: (e: React.DragEvent, documentId: string) => void;
  onDocumentDragOver: (e: React.DragEvent) => void;
  onDocumentDrop: (e: React.DragEvent, targetDocumentId: string) => void;
  onDocumentDragEnd: () => void;
  onDeletePresentation: () => void;
  onOpenPresentationModal: () => void;
}

const WeddingDetails = ({
  selectedWedding,
  draggedDocumentId,
  onBack,
  onEditWedding,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  onTaskDragEnd,
  onCreateDocument,
  onEditDocument,
  onDeleteDocument,
  onDocumentDragStart,
  onDocumentDragOver,
  onDocumentDrop,
  onDocumentDragEnd,
  onDeletePresentation,
  onOpenPresentationModal,
}: WeddingDetailsProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
        <div className="w-full sm:w-auto min-w-0">
          <button
            onClick={onBack}
            className="text-[16px] sm:text-[18px] max-[1599px]:text-[16px] font-forum text-[#00000080] hover:text-black transition-colors mb-2 cursor-pointer"
          >
            Вернуться к ивентам
          </button>
          <h2 className="text-[28px] sm:text-[32px] md:text-[36px] lg:text-[54px] max-[1599px]:text-[40px] lg:max-[1599px]:text-[36px] min-[1300px]:max-[1599px]:text-[42px] font-forum font-bold leading-tight text-black break-words">
            {selectedWedding.project_name || 'Без названия'}
          </h2>
        </div>
        <button
          onClick={() => onEditWedding(selectedWedding)}
          className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white border border-[#00000033] text-black rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] sm:text-[16px] md:text-[18px] max-[1599px]:text-[16px] font-forum w-full sm:w-auto"
        >
          Редактировать ивент
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Wedding Info */}
        <div className="bg-white border border-[#00000033] rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-[20px] sm:text-[22px] md:text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-3 sm:mb-4">Информация об ивенте</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дата свадьбы</p>
              <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                {new Date(selectedWedding.wedding_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div>
              <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Дней до свадьбы</p>
              <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const wedding = new Date(selectedWedding.wedding_date);
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
                {selectedWedding.country_ru || selectedWedding.country || selectedWedding.country_en || selectedWedding.country_ua || ''}
              </p>
            </div>
            <div>
              <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Место</p>
              <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1 break-words">{selectedWedding.venue}</p>
            </div>
            <div>
              <p className="text-[14px] sm:text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Количество гостей</p>
              <p className="text-[18px] sm:text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{selectedWedding.guest_count}</p>
            </div>
            {selectedWedding.client && (
              <div>
                <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">Клиент</p>
                <p className="text-[20px] max-[1599px]:text-[18px] font-forum font-bold text-black mt-1">{selectedWedding.client.name}</p>
                <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080] mt-1">{selectedWedding.client.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Client Notes */}
        {selectedWedding.notes && (
          <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
            <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black mb-4">Заметки клиента</h3>
            <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
              <p className="text-[18px] max-[1599px]:text-[16px] font-forum font-light text-black whitespace-pre-wrap">
                {selectedWedding.notes}
              </p>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Задания</h3>
              <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                Перетащите элементы для изменения порядка
              </p>
            </div>
            <button
              onClick={onCreateTask}
              className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
            >
              + Добавить задание
            </button>
          </div>
          {selectedWedding.tasks && selectedWedding.tasks.length > 0 ? (
            <div className="space-y-3">
              {selectedWedding.tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => onTaskDragStart(e, task.id)}
                  onDragOver={onTaskDragOver}
                  onDrop={(e) => onTaskDrop(e, task.id)}
                  onDragEnd={onTaskDragEnd}
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
                      onClick={() => onEditTask(task)}
                      className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
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
        <div className="bg-white border border-[#00000033] rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-[26px] max-[1599px]:text-[22px] font-forum font-bold text-black">Документы</h3>
              <p className="text-[14px] max-[1599px]:text-[13px] font-forum font-light text-[#00000060] mt-1">
                Перетащите элементы для изменения порядка (закрепленные и незакрепленные отдельно)
              </p>
            </div>
            <button
              onClick={onCreateDocument}
              className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
            >
              + Добавить документ
            </button>
          </div>
          {selectedWedding.documents && selectedWedding.documents.length > 0 ? (
            <div className="space-y-3">
              {selectedWedding.documents.map((doc) => (
                <div
                  key={doc.id}
                  draggable
                  onDragStart={(e) => onDocumentDragStart(e, doc.id)}
                  onDragOver={onDocumentDragOver}
                  onDrop={(e) => onDocumentDrop(e, doc.id)}
                  onDragEnd={onDocumentDragEnd}
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
                      onClick={() => onEditDocument(doc)}
                      className="px-3 py-1 bg-white border border-[#00000033] text-black rounded hover:bg-gray-50 transition-colors cursor-pointer text-[16px] font-forum"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => onDeleteDocument(doc)}
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
              {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' && (
                <button
                  onClick={onDeletePresentation}
                  className="px-4 md:px-6 py-2 md:py-3 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
                >
                  Удалить презентацию
                </button>
              )}
              <button
                onClick={onOpenPresentationModal}
                className="px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[18px] max-[1599px]:text-[16px] font-forum"
              >
                {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                  ? 'Изменить презентацию' 
                  : 'Загрузить презентацию'}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
              {selectedWedding.presentation && selectedWedding.presentation.type === 'wedding' 
                ? `Тип: Презентация свадьбы - "${selectedWedding.presentation.title}"`
                : `Тип: Стандартная презентация компании`}
            </p>
            {selectedWedding.presentation && selectedWedding.presentation.sections && (
              <p className="text-[16px] max-[1599px]:text-[15px] font-forum font-light text-[#00000080]">
                Секций: {selectedWedding.presentation.sections.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeddingDetails;

