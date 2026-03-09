import { supabase } from '../lib/supabase';

export const uploadPresentationPdf = async (weddingId: string, pdfFile: File) => {
  const filePath = `presentations/${weddingId}/${Date.now()}_${pdfFile.name}`;
  const { error } = await supabase.storage
    .from('presentations')
    .upload(filePath, pdfFile, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error('Ошибка загрузки PDF');
  return filePath;
};

export const createPresentation = async (weddingId: string, title: string, pdfFilePath: string) => {
  const { data, error } = await supabase
    .from('presentations')
    .insert({ wedding_id: weddingId, title, pdf_file_path: pdfFilePath })
    .select()
    .single();
  if (error) throw new Error('Ошибка создания презентации');
  return data;
};

export const triggerPdfToImages = async (weddingId: string, presentationId: string) => {
  const response = await fetch('/functions/v1/pdf-to-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wedding_id: weddingId, presentation_id: presentationId }),
  });
  if (!response.ok) throw new Error('Ошибка конвертации PDF в изображения');
  return response.json();
};

export const updatePresentationSections = async (presentationId: string, sections: { title: string; page_number: number }[]) => {
  // Удаляем старые секции
  await supabase.from('presentation_sections').delete().eq('presentation_id', presentationId);
  // Вставляем новые
  const { error } = await supabase.from('presentation_sections').insert(
    sections.map((s, i) => ({
      presentation_id: presentationId,
      title: s.title,
      page_number: s.page_number,
      order_index: i,
    }))
  );
  if (error) throw new Error('Ошибка обновления секций презентации');
};

export const getPresentation = async (weddingId: string) => {
  const { data, error } = await supabase
    .from('presentations')
    .select('*, presentation_sections(*)')
    .eq('wedding_id', weddingId)
    .single();
  if (error) throw new Error('Ошибка загрузки презентации');
  return data;
};

