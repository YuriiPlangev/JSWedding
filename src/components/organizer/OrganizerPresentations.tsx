import { useState } from 'react';
import { useCustomPresentations } from '../../hooks';
import { presentationServiceExtended } from '../../services/weddingService';
import { convertPdfToImages, dataUrlToFile } from '../../utils/pdfToImages';
import PresentationUploadModal from '../modals/PresentationUploadModal';
import Toast from '../Toast';

interface OrganizerPresentationsProps {
  weddingId: string;
}

const OrganizerPresentations = ({ weddingId }: OrganizerPresentationsProps) => {
  const { data: presentations = [], refetch } = useCustomPresentations(weddingId);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleUploadPresentation = async (data: {
    title: string;
    pdfFile: File;
    sections: Array<{ title: string; page_number: number }>;
  }) => {
    try {
      setIsUploading(true);
      console.log('OrganizerPresentations: Starting upload for wedding:', weddingId);

      // 1. Загружаем PDF файл в Storage
      console.log('Step 1: Uploading PDF file...');
      const pdfFilePath = await presentationServiceExtended.uploadPresentationPdf(
        weddingId,
        data.pdfFile
      );
      console.log('PDF uploaded:', pdfFilePath);

      // 2. Создаем запись презентации в БД
      console.log('Step 2: Creating presentation record...');
      const presentation = await presentationServiceExtended.createPresentation(
        weddingId,
        data.title,
        pdfFilePath
      );
      console.log('Presentation created:', presentation);

      // 3. Конвертируем PDF в изображения на клиенте
      console.log('Step 3: Converting PDF to images...');
      const imageDataUrls = await convertPdfToImages(data.pdfFile);
      console.log(`Converted ${imageDataUrls.length} images from PDF`);

      // 4. Загружаем изображения в Storage
      console.log('Step 4: Uploading images to storage...');
      const imageFiles = imageDataUrls.map((dataUrl, index) => 
        dataUrlToFile(dataUrl, `page_${index + 1}.jpg`)
      );
      
      const imageUrls = await presentationServiceExtended.uploadPresentationImages(
        weddingId,
        presentation.id,
        imageFiles
      );
      console.log('Images uploaded:', imageUrls.length, 'URLs');

      // 5. Сохраняем секции презентации
      if (data.sections && data.sections.length > 0) {
        console.log('Step 5: Saving', data.sections.length, 'sections...');
        await presentationServiceExtended.updatePresentationSections(
          presentation.id,
          data.sections
        );
        console.log('Sections saved successfully');
      }

      setToastMessage('Презентация успешно загружена');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      setShowUploadModal(false);
      refetch();
    } catch (error) {
      console.error('Error in handleUploadPresentation:', error);
      const message = error instanceof Error ? error.message : 'Ошибка при загрузке презентации';
      setToastMessage(message);
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePresentation = async (presentationId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту презентацию?')) {
      return;
    }

    try {
      await presentationServiceExtended.deletePresentation(presentationId);
      setToastMessage('Презентация удалена');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при удалении';
      setToastMessage(message);
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Кнопка загрузки */}
      <div className="flex justify-between items-center">
        <h3 className="text-[18px] font-forum font-bold text-black">Презентации</h3>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-black text-white rounded-lg font-forum font-bold text-[14px] hover:bg-[#00000090] transition-colors"
        >
          + Загрузить
        </button>
      </div>

      {/* Список презентаций */}
      {presentations.length > 0 ? (
        <div className="space-y-3">
          {presentations.map((presentation) => (
            <div
              key={presentation.id}
              className="p-4 border border-[#00000033] rounded-lg bg-[#00000005] hover:bg-[#00000010] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-[14px] font-forum font-bold text-black">
                    {presentation.title}
                  </h4>
                  <p className="text-[12px] font-forum text-[#00000080]">
                    {presentation.presentation_sections?.length || 0} раздел(ов)
                    {presentation.image_urls && (
                      <> • {presentation.image_urls.length} изображ.</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePresentation(presentation.id)}
                  className="text-[#00000080] hover:text-red-600 transition-colors text-lg ml-2"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>

              {/* Список частей */}
              {presentation.presentation_sections && presentation.presentation_sections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#00000033]">
                  <p className="text-[11px] font-forum text-[#00000080] mb-2">Разделы:</p>
                  <div className="flex flex-wrap gap-1">
                    {presentation.presentation_sections
                      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                      .map((section) => (
                        <span
                          key={section.id}
                          className="inline-block px-2 py-1 bg-black text-white text-[11px] font-forum rounded"
                        >
                          {section.title} (стр. {section.page_number})
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-[#00000005] rounded-lg border border-[#00000033]">
          <p className="text-[14px] font-forum text-[#00000080]">
            Презентаций еще не загружено. Нажмите кнопку выше для загрузки.
          </p>
        </div>
      )}

      {/* Модальное окно загрузки */}
      <PresentationUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadPresentation}
        isLoading={isUploading}
      />

      {/* Toast сообщения */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          show={showToast} 
          onClose={() => setShowToast(false)} 
        />
      )}
    </div>
  );
};

export default OrganizerPresentations;
