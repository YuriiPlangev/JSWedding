import { useEffect, useRef } from 'react';
import type { Document } from '../types';
import { getTranslation } from '../utils/translations';
import downloadIcon from '../assets/download.svg';

interface DocumentsListProps {
  documents: Document[];
  currentLanguage?: 'en' | 'ru' | 'ua';
}

const DocumentsList = ({ documents, currentLanguage = 'ru' }: DocumentsListProps) => {
  const scrollableRef = useRef<HTMLDivElement>(null);

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
              {pinnedDocuments.map((doc) => (
                <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'>
                  <a
                    href={doc.link || doc.file_url || '#'}
                    target={doc.link ? '_blank' : undefined}
                    rel={doc.link ? 'noopener noreferrer' : undefined}
                    className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity'
                  >
                    {doc.name}
                  </a>
                  <img src={downloadIcon} alt="download" className='w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 opacity-60' />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Незакрепленные документы */}
      {unpinnedDocuments.length > 0 && (
        <div ref={scrollableRef} className='px-4 md:px-8 lg:px-12 xl:px-[60px] max-h-[200px] overflow-y-auto documents-scrollable'>
          <ul className='pb-4 max-[1599px]:pb-3 lg:max-[1599px]:pb-3 min-[1300px]:max-[1599px]:pb-3'>
            {unpinnedDocuments.map((doc) => (
              <li key={doc.id} className='py-2 max-[1599px]:py-1.5 lg:max-[1599px]:py-1.5 min-[1300px]:max-[1599px]:py-1.5 min-[1600px]:py-2.5 flex items-center justify-between'> 
                  <a
                    href={doc.link || doc.file_url || '#'}
                    target={doc.link ? '_blank' : undefined}
                    rel={doc.link ? 'noopener noreferrer' : undefined}
                    className='text-[24px] max-[1599px]:text-[18px] lg:max-[1599px]:text-[17px] min-[1300px]:max-[1599px]:text-[19px] font-forum font-light underline underline-offset-4 hover:opacity-70 transition-opacity'
                  >
                    {doc.name}
                  </a>
                  <img src={downloadIcon} alt="download" className='w-4 h-4 md:w-5 md:h-5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 opacity-60' />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;

