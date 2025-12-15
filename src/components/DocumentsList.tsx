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
  const unpinnedDocuments = documents.filter((doc) => !doc.pinned);

  // Обработчик открытия ссылки (для названия документа)
  const handleLinkClick = (doc: Document, e: React.MouseEvent) => {
    // Всегда предотвращаем стандартное поведение ссылки, чтобы избежать скролла наверх
    e.preventDefault();
    
    // Если есть ссылка (Google Docs и т.д.), открываем её в новой вкладке
    if (doc.link) {
      window.open(doc.link, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Если есть file_url, открываем его в новой вкладке
    if (doc.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Обработчик скачивания файла (для кнопки скачивания)
  const handleDownload = async (doc: Document, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Если есть только ссылка (без файла), не скачиваем
    if (doc.link && !doc.file_url && !doc.file_path) {
      // Для документов только со ссылкой скачивание недоступно
      return;
    }

    // Если нет файла для скачивания
    if (!doc.file_url && !doc.file_path) {
      console.warn('Document has no file to download:', doc);
      return;
    }

    setDownloadingIds((prev) => new Set(prev).add(doc.id));

    try {
      let blob: Blob | null = null;

      // Если есть file_url (signed URL), скачиваем по нему
      if (doc.file_url) {
        const response = await fetch(doc.file_url);
        if (!response.ok) {
          throw new Error('Failed to download file');
        }
        blob = await response.blob();
      } 
      // Если есть file_path но нет file_url, скачиваем через API
      else if (doc.file_path) {
        blob = await documentService.downloadDocument(doc);
        if (!blob) {
          throw new Error('Failed to download document');
        }
      }

      if (blob) {
        // Создаем временную ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Ошибка при скачивании документа. Попробуйте обновить страницу.');
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  return (
    <div>
      {/* Закрепленные документы */}
      {pinnedDocuments.length > 0 && (
        <div className='border-b border-[#00000033]'>
          <div className='px-4 md:px-8 lg:px-12 xl:px-[60px] pt-0 pb-2'>
            <p className='text-[16px]  max-[1599px]:text-[14px] lg:max-[1599px]:text-[13px] min-[1300px]:max-[1599px]:text-[14px] font-forum font-light text-[#00000080] mb-2'>
              {getTranslation(currentLanguage).dashboard.pinnedDocuments}
            </p>
            <ul>
              {pinnedDocuments.map((doc) => {
                const hasLink = doc.link || doc.file_url;
                const linkClassName = hasLink
                  ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer'
                  : 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light text-[#00000040] cursor-default';
                
                return (
                  <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'>
                    {hasLink ? (
                      <a
                        href={doc.link || doc.file_url || '#'}
                        target={doc.link ? '_blank' : doc.file_url ? '_blank' : undefined}
                        rel={doc.link || doc.file_url ? 'noopener noreferrer' : undefined}
                        onClick={(e) => handleLinkClick(doc, e)}
                        className={linkClassName}
                      >
                        {doc.name}
                      </a>
                    ) : (
                      <span className={linkClassName}>
                        {doc.name}
                      </span>
                    )}
                  {downloadingIds.has(doc.id) ? (
                    <div className="w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    (doc.file_url || doc.file_path) && (
                      <button
                        onClick={(e) => handleDownload(doc, e)}
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                        aria-label="Скачать документ"
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
        <div ref={scrollableRef} className='px-4 md:px-8 lg:px-12 xl:px-[60px] max-h-[200px] overflow-y-auto documents-scrollable'>
          <ul className='py-4 max-[1599px]:pb-3 lg:max-[1599px]:pb-3 min-[1300px]:max-[1599px]:pb-3'>
            {unpinnedDocuments.map((doc) => {
              const hasLink = doc.link || doc.file_url;
              const linkClassName = hasLink
                ? 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer'
                : 'text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light text-[#00000040] cursor-default';
              
              return (
                <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'> 
                  {hasLink ? (
                    <a
                      href={doc.link || doc.file_url || '#'}
                      target={doc.link ? '_blank' : doc.file_url ? '_blank' : undefined}
                      rel={doc.link || doc.file_url ? 'noopener noreferrer' : undefined}
                      onClick={(e) => handleLinkClick(doc, e)}
                      className={linkClassName}
                    >
                      {doc.name}
                    </a>
                  ) : (
                    <span className={linkClassName}>
                      {doc.name}
                    </span>
                  )}
                  {downloadingIds.has(doc.id) ? (
                    <div className="w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    (doc.file_url || doc.file_path) && (
                      <button
                        onClick={(e) => handleDownload(doc, e)}
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                        aria-label="Скачать документ"
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
      )}
    </div>
  );
};

export default DocumentsList;

