import { supabase } from '../lib/supabase';
import type { ContractorDocument, Wedding } from '../types';

/**
 * Service for managing contractor access and contractor documents.
 */
export const contractorService = {
  /**
   * Create or refresh contractor access for an event (token + password).
   */
  async setupContractorAccess(
    weddingId: string,
    password: string,
    settings: {
      dressCode?: string;
      organizerContacts?: string;
      coordinatorContacts?: string;
    }
  ): Promise<{ token: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('setup_contractor_access', {
        p_wedding_id: weddingId,
        p_password: password,
        p_dress_code: settings.dressCode || null,
        p_organizer_contacts: settings.organizerContacts || null,
        p_coordinator_contacts: settings.coordinatorContacts || null,
      });

      if (error) {
        return { token: null, error: error.message };
      }

      return { token: data || null, error: null };
    } catch (error) {
      console.error('Error setting up contractor access:', error);
      return { token: null, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Verify contractor token/password pair.
   */
  async verifyContractorAccess(token: string, password: string): Promise<{ valid: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('verify_contractor_access', {
        p_token: token,
        p_password: password,
      });

      if (error) {
        return { valid: false, error: error.message };
      }

      return { valid: Boolean(data), error: null };
    } catch (error) {
      console.error('Error verifying contractor access:', error);
      return { valid: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Update contractor settings for an event
   */
  async updateContractorSettings(
    weddingId: string,
    settings: {
      dressCode?: string;
      organizerContacts?: string;
      coordinatorContacts?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('weddings')
        .update({
          contractor_dress_code: settings.dressCode,
          contractor_organizer_contacts: settings.organizerContacts,
          contractor_coordinator_contacts: settings.coordinatorContacts,
        })
        .eq('id', weddingId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating contractor settings:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get contractor documents for an event (organizer flow).
   */
  async getContractorDocuments(weddingId: string): Promise<{ documents: ContractorDocument[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('contractor_documents')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: true });

      if (error) {
        return { documents: [], error: error.message };
      }

      return { documents: data || [], error: null };
    } catch (error) {
      console.error('Error fetching contractor documents:', error);
      return { documents: [], error: 'Unexpected error occurred' };
    }
  },

  /**
   * Add a new contractor document
   * @param weddingId - Event/wedding ID
   * @param document - Document data
   */
  async addContractorDocument(
    weddingId: string,
    document: {
      name?: string;
      name_en?: string;
      name_ru?: string;
      name_ua?: string;
      link: string;
    }
  ): Promise<{ document: ContractorDocument | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('contractor_documents')
        .insert({
          wedding_id: weddingId,
          name: document.name,
          name_en: document.name_en,
          name_ru: document.name_ru,
          name_ua: document.name_ua,
          link: document.link,
        })
        .select()
        .single();

      if (error) {
        return { document: null, error: error.message };
      }

      return { document: data, error: null };
    } catch (error) {
      console.error('Error adding contractor document:', error);
      return { document: null, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Update a contractor document
   * @param documentId - Document ID
   * @param updates - Updated document fields
   */
  async updateContractorDocument(
    documentId: string,
    updates: {
      name?: string;
      name_en?: string;
      name_ru?: string;
      name_ua?: string;
      link?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('contractor_documents')
        .update(updates)
        .eq('id', documentId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating contractor document:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Delete a contractor document
   * @param documentId - Document ID
   */
  async deleteContractorDocument(documentId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('contractor_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting contractor document:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get wedding data for contractor by token/password (public flow).
   */
  async getContractorWeddingByAccess(token: string, password: string): Promise<{ wedding: Wedding | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_contractor_wedding_by_access', {
        p_token: token,
        p_password: password,
      });

      if (error) {
        return { wedding: null, error: error.message };
      }

      if (!data || data.length === 0) {
        return { wedding: null, error: 'Invalid link or password' };
      }

      return { wedding: data[0], error: null };
    } catch (error) {
      console.error('Error fetching contractor wedding by access:', error);
      return { wedding: null, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get contractor documents by token/password (public flow).
   */
  async getContractorDocumentsByAccess(token: string, password: string): Promise<{ documents: ContractorDocument[]; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_contractor_documents_by_access', {
        p_token: token,
        p_password: password,
      });

      if (error) {
        return { documents: [], error: error.message };
      }

      return { documents: data || [], error: null };
    } catch (error) {
      console.error('Error fetching contractor documents by access:', error);
      return { documents: [], error: 'Unexpected error occurred' };
    }
  },

  /**
   * Legacy compatibility method for old contractor account route.
   */
  async getContractorWedding(_contractorUserId: string): Promise<{ wedding: Wedding | null; error: string | null }> {
    return {
      wedding: null,
      error: 'Contractor account access is disabled. Use the unique contractor link instead.',
    };
  },
};
