import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RequestBody {
  wedding_id: string;
  presentation_id: string;
}

serve(async (req: Request) => {
  try {
    const { wedding_id, presentation_id } = (await req.json()) as RequestBody;
    if (!wedding_id || !presentation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing wedding_id or presentation_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the PDF file path from database
    const { data: presentation, error: presentationError } = await supabase
      .from('presentations')
      .select('pdf_file_path')
      .eq('id', presentation_id)
      .single();

    if (presentationError || !presentation?.pdf_file_path) {
      return new Response(
        JSON.stringify({ error: 'Presentation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Download the PDF file
    const { data: pdfData, error: storageError } = await supabase.storage
      .from('presentations')
      .download(presentation.pdf_file_path);

    if (storageError || !pdfData) {
      return new Response(
        JSON.stringify({ error: 'PDF not found in storage' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For now, return a placeholder response
    // In production, you would integrate with a PDF-to-image library
    // This is a stub that marks the presentation as processed
    const imageUrls: string[] = [];

    // Update the presentations table with image URLs
    const { error: updateError } = await supabase
      .from('presentations')
      .update({ image_urls: imageUrls })
      .eq('id', presentation_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update presentation' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ image_urls: imageUrls, status: 'Processing PDF - manual image upload required' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
