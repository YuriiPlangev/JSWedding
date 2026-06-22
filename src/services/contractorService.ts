import { supabase } from '../lib/supabase';
import type { ContractorDocument, CustomPresentation, Wedding } from '../types';

/**
 * Service for managing contractor access and contractor documents.
 */
export const contractorService = {
  isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },

  async syncContractorSettingsToWedding(
    weddingId: string,
    settings: {
      dressCode?: string;
      organizerContacts?: string;
      coordinatorContacts?: string;
      venueAddress?: string;
      mapsUrl?: string;
      contractorSlug?: string;
    },
    passwordPlain?: string | null
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const payload: Record<string, string | null> = {
        contractor_dress_code: settings.dressCode ?? null,
        contractor_organizer_contacts: settings.organizerContacts ?? null,
        contractor_coordinator_contacts: settings.coordinatorContacts ?? null,
        contractor_venue_address: settings.venueAddress?.trim() || null,
        contractor_maps_url: settings.mapsUrl?.trim() || null,
        contractor_slug: settings.contractorSlug?.trim() || null,
      };

      if (passwordPlain !== undefined) {
        payload.contractor_password_plain = passwordPlain;
      }

      const { error } = await supabase.from('weddings').update(payload).eq('id', weddingId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error syncing contractor settings:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  },

  async enrichContractorWeddingWithVenueInfo(
    slug: string,
    password: string,
    wedding: Wedding
  ): Promise<Wedding> {
    try {
      const rpcName = this.isUuid(slug)
        ? 'get_contractor_venue_info_by_access'
        : 'get_contractor_venue_info_by_access_slug';
      const rpcParams = this.isUuid(slug)
        ? { p_token: slug, p_password: password }
        : { p_slug: slug, p_password: password };

      const { data, error } = await supabase.rpc(rpcName, rpcParams);
      if (error || !Array.isArray(data) || data.length === 0) {
        return wedding;
      }

      const extras = data[0] as {
        contractor_venue_address?: string | null;
        contractor_maps_url?: string | null;
      };

      return {
        ...wedding,
        contractor_venue_address: extras.contractor_venue_address ?? wedding.contractor_venue_address,
        contractor_maps_url: extras.contractor_maps_url ?? wedding.contractor_maps_url,
      };
    } catch (error) {
      console.error('Error enriching contractor wedding with venue info:', error);
      return wedding;
    }
  },

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
      venueAddress?: string;
      mapsUrl?: string;
      contractorSlug?: string;
    }
  ): Promise<{ token: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('setup_contractor_access', {
        p_wedding_id: weddingId,
        p_password: password,
        p_dress_code: settings.dressCode || null,
        p_organizer_contacts: settings.organizerContacts || null,
        p_coordinator_contacts: settings.coordinatorContacts || null,
        p_venue_address: settings.venueAddress?.trim() || null,
        p_maps_url: settings.mapsUrl?.trim() || null,
        p_slug: settings.contractorSlug?.trim() || null,
      });

      if (error) {
        return { token: null, error: error.message };
      }

      const syncResult = await this.syncContractorSettingsToWedding(weddingId, settings, password);
      if (!syncResult.success) {
        return { token: null, error: syncResult.error };
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
      venueAddress?: string;
      mapsUrl?: string;
      contractorSlug?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    return this.syncContractorSettingsToWedding(weddingId, settings);
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
   * Get wedding data for contractor by slug/password (public flow).
   */
  async getContractorWeddingByAccess(slug: string, password: string): Promise<{ wedding: Wedding | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_contractor_wedding_by_access_slug', {
        p_slug: slug,
        p_password: password,
      });

      if (error && !this.isUuid(slug)) {
        return { wedding: null, error: error.message };
      }

      if (data && data.length > 0) {
        const wedding = await this.enrichContractorWeddingWithVenueInfo(slug, password, data[0] as Wedding);
        return { wedding, error: null };
      }

      if (this.isUuid(slug)) {
        const { data: tokenData, error: tokenError } = await supabase.rpc('get_contractor_wedding_by_access', {
          p_token: slug,
          p_password: password,
        });
        if (tokenError) {
          return { wedding: null, error: tokenError.message };
        }
        if (!tokenData || tokenData.length === 0) {
          return { wedding: null, error: 'Invalid link or password' };
        }
        const wedding = await this.enrichContractorWeddingWithVenueInfo(slug, password, tokenData[0] as Wedding);
        return { wedding, error: null };
      }

      return { wedding: null, error: 'Invalid link or password' };
    } catch (error) {
      console.error('Error fetching contractor wedding by access:', error);
      return { wedding: null, error: 'Unexpected error occurred' };
    }
  },

  /**
   * Get contractor documents by slug/password (public flow).
   */
  async getContractorDocumentsByAccess(slug: string, password: string): Promise<{ documents: ContractorDocument[]; error: string | null }> {
    try {
      if (this.isUuid(slug)) {
        const { data: tokenData, error: tokenError } = await supabase.rpc('get_contractor_documents_by_access', {
          p_token: slug,
          p_password: password,
        });
        if (tokenError) {
          return { documents: [], error: tokenError.message };
        }
        return { documents: tokenData || [], error: null };
      }

      const { data, error } = await supabase.rpc('get_contractor_documents_by_access_slug', {
        p_slug: slug,
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
   * Get contractor presentations by slug/password (public flow).
   */
  async getContractorPresentationsByAccess(
    slug: string,
    password: string
  ): Promise<{ presentations: CustomPresentation[]; error: string | null }> {
    try {
      if (this.isUuid(slug)) {
        const { data: tokenData, error: tokenError } = await supabase.rpc('get_contractor_presentations_by_access', {
          p_token: slug,
          p_password: password,
        });
        if (tokenError) {
          return { presentations: [], error: tokenError.message };
        }
        const list = Array.isArray(tokenData) ? tokenData : [];
        return { presentations: list as CustomPresentation[], error: null };
      }

      const { data, error } = await supabase.rpc('get_contractor_presentations_by_access_slug', {
        p_slug: slug,
        p_password: password,
      });

      if (error) {
        return { presentations: [], error: error.message };
      }

      return { presentations: (Array.isArray(data) ? data : []) as CustomPresentation[], error: null };
    } catch (error) {
      console.error('Error fetching contractor presentations by access:', error);
      return { presentations: [], error: 'Unexpected error occurred' };
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
