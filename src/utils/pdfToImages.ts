import * as pdfjsLib from 'pdfjs-dist';

// Устанавливаем worker для PDF.js
// Worker скопирован в public folder во время npm install
if (typeof window !== 'undefined') {
  // Используем .mjs версию (ES modules)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log(`[PDF.js] Worker configured: /pdf.worker.min.mjs`);
}

/**
 * Конвертирует PDF в массив изображений (canvas как data URL)
 * @param pdfFile - File объект PDF
 * @param maxPages - максимальное количество страниц для конвертации (по умолчанию все)
 * @returns массив data URL изображений
 */
export async function convertPdfToImages(
  pdfFile: File,
  maxPages?: number
): Promise<string[]> {
  try {
    // Читаем файл как ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Загружаем PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const imageUrls: string[] = [];

    // Определяем количество страниц для обработки
    const numPages = maxPages ? Math.min(maxPages, pdf.numPages) : pdf.numPages;

    console.log(`Converting PDF with ${numPages} pages to images...`);

    // Конвертируем каждую страницу
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Устанавливаем высокое разрешение для качественных изображений
      const scale = 2; // 2x увеличение (обычно 96dpi * 2 = 192dpi)
      const viewport = page.getViewport({ scale });

      // Создаем canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Рендерим страницу на canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Преобразуем canvas в data URL (JPEG для меньшего размера)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      imageUrls.push(imageDataUrl);

      console.log(`Page ${pageNum} converted to image`);
    }

    console.log(`Successfully converted ${imageUrls.length} pages to images`);
    return imageUrls;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw error;
  }
}

/**
 * Преобразует data URL изображения в File
 * @param dataUrl - data URL изображения
 * @param filename - имя файла
 * @returns File объект
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const binaryString = atob(parts[1]);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mimeType });
}
