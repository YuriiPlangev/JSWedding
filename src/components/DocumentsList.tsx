import { useEffect, useRef, useState } from 'react';
import type { Document } from '../types';
import { getTranslation } from '../utils/translations';
import { documentService } from '../services/weddingService';
import downloadIcon from '../assets/download.svg';

interface DocumentsListProps {
  documents: Document[];
  currentLanguage?: 'en' | 'ru' | 'ua';
}

const DocumentsList = ({ documents, currentLanguage = 'ru' }: DocumentsListProps) => {
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Функция для получения названия документа на текущем языке
  const getDocumentName = (doc: Document): string => {
    if (currentLanguage === 'en' && doc.name_en) return doc.name_en;
    if (currentLanguage === 'ru' && doc.name_ru) return doc.name_ru;
    if (currentLanguage === 'ua' && doc.name_ua) return doc.name_ua;
    // Fallback на основное поле name или первое доступное
    return doc.name || doc.name_en || doc.name_ru || doc.name_ua || '';
  };

  useEffect(() => {
    // Дополнительная попытка скрыть стрелки через JavaScript для Chrome
    if (scrollableRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        .documents-scrollable::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          background: transparent !important;
          background-image: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
  if (documents.length === 0) {
    return null;
  }

  // Разделяем документы на закрепленные и незакрепленные
  const pinnedDocuments = documents.filter((doc) => doc.pinned === true);
  const unpinnedDocuments = documents
    .filter((doc) => !doc.pinned)
    // Сортируем незакрепленные: сначала документы со ссылками, потом без ссылок
    .sort((a, b) => {
      const aHasLink = !!a.link;
      const bHasLink = !!b.link;
      // Если у одного есть ссылка, а у другого нет - документ со ссылкой идет первым
      if (aHasLink && !bHasLink) return -1;
      if (!aHasLink && bHasLink) return 1;
      // Если оба со ссылками или оба без ссылок - сохраняем исходный порядок
      return 0;
    });

  // Обработчик открытия ссылки (для названия документа)
  const handleLinkClick = (doc: Document, e: React.MouseEvent) => {
    // Всегда предотвращаем стандартное поведение ссылки, чтобы избежать скролла наверх
    e.preventDefault();
    
    // Если есть ссылка, открываем её в новой вкладке
    if (doc.link) {
      window.open(doc.link, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  // Обработчик скачивания файла (для кнопки скачивания)
  const handleDownload = async (doc: Document, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Если нет ссылки, скачивание недоступно
    if (!doc.link) {
      console.warn('Document has no link to download:', doc);
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(doc.id));

    try {
      // Генерируем ссылку на скачивание из внешней ссылки
      const downloadUrl = documentService.generateDownloadUrl(doc.link);
      
      if (!downloadUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Определяем расширение файла на основе типа документа
      let fileExtension = '';
      try {
        const url = new URL(downloadUrl);
        if (url.hostname.includes('docs.google.com')) {
          if (url.pathname.includes('/document/')) {
            fileExtension = '.pdf';
          } else if (url.pathname.includes('/spreadsheets/')) {
            fileExtension = '.xlsx';
          } else if (url.pathname.includes('/presentation/')) {
            fileExtension = '.pdf';
          }
        } else if (url.pathname) {
          // Пытаемся извлечь расширение из URL
          const match = url.pathname.match(/\.([a-zA-Z0-9]+)(\?|$)/);
          if (match) {
            fileExtension = `.${match[1]}`;
          }
        }
      } catch {
        // Если не удалось определить расширение, используем пустую строку
      }

      // Создаем скрытый элемент <a> для скачивания
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${doc.name || 'document'}${fileExtension}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Кликаем по ссылке для начала скачивания
      link.click();
      
      // Удаляем элемент после небольшой задержки
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      // Показываем индикацию скачивания минимум 1.5 секунды для лучшей обратной связи
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error downloading document:', error);
      alert(getTranslation(currentLanguage).common.downloadError);
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Закрепленные документы */}
      {pinnedDocuments.length > 0 && (
        <div className='border-b border-[#00000033] shrink-0'>
          <div className='px-4 md:px-8 lg:px-12 xl:px-[60px] pt-0 pb-2'>
            <p className='text-[16px]  max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mb-2'>
              {getTranslation(currentLanguage).dashboard.pinnedDocuments}
            </p>
            <ul>
              {pinnedDocuments.map((doc) => {
                const hasLink = !!doc.link;
                const linkClassName = hasLink
                  ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer'
                  : 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light text-[#00000040] cursor-default';
                
                const isDownloading = downloadingIds.has(doc.id);
                const downloadingClassName = isDownloading 
                  ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 opacity-60 transition-opacity cursor-pointer'
                  : linkClassName;
                
                return (
                  <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'>
                    {hasLink ? (
                      <a
                        href={doc.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleLinkClick(doc, e)}
                        className={downloadingClassName}
                      >
                        {getDocumentName(doc)}
                      </a>
                    ) : (
                      <span className={downloadingClassName}>
                        {getDocumentName(doc)}
                      </span>
                    )}
                  {isDownloading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    doc.link && (
                      <button
                        onClick={(e) => handleDownload(doc, e)}
                        className="cursor-pointer hover:opacity-70 transition-opacity pr-[10px]"
                        aria-label={getTranslation(currentLanguage).common.downloadDocument}
                        type="button"
                      >
                        <img src={downloadIcon} alt="download" className='w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 opacity-60' />
                      </button>
                    )
                  )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Незакрепленные документы */}
      {unpinnedDocuments.length > 0 && (
        <div ref={scrollableRef} className='flex-1 overflow-y-auto documents-scrollable min-h-0'>
          <div className='px-4 md:px-8 lg:px-12 xl:px-[60px] pb-6'>
            <ul className='py-4'>
            {unpinnedDocuments.map((doc) => {
                const hasLink = !!doc.link;
                const linkClassName = hasLink
                  ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer'
                  : 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light text-[#00000040] cursor-default';
                
                const isDownloading = downloadingIds.has(doc.id);
                const downloadingClassName = isDownloading 
                  ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 opacity-60 transition-opacity cursor-pointer'
                  : linkClassName;
                
                return (
                  <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'> 
                    {hasLink ? (
                      <a
                        href={doc.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleLinkClick(doc, e)}
                        className={downloadingClassName}
                      >
                        {getDocumentName(doc)}
                      </a>
                    ) : (
                      <span className={downloadingClassName}>
                        {getDocumentName(doc)}
                      </span>
                    )}
                    {isDownloading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      doc.link && (
                        <button
                          onClick={(e) => handleDownload(doc, e)}
                          className="cursor-pointer hover:opacity-70 transition-opacity"
                          aria-label={getTranslation(currentLanguage).common.downloadDocument}
                          type="button"
                        >
                          <img src={downloadIcon} alt="download" className='w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 opacity-60' />
                        </button>
                      )
                    )}
                  </li>
              );
            })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;

