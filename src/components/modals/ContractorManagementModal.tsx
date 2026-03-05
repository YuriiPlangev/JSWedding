import { useEffect, useState } from 'react';
import type { ContractorDocument } from '../../types';
import { contractorService } from '../../services/contractorService';

interface Coordinator {
  id: string;
  name: string;
  phone: string;
  telegram: string;
}

interface ContractorManagementModalProps {
  weddingId: string;
  existingContractorToken?: string | null;
  existingContractorPassword?: string | null;
  initialSettings?: {
    dressCode?: string;
    organizerContacts?: string;
    coordinatorContacts?: string;
  };
  onClose: () => void;
  onSave: () => void;
}

const ContractorManagementModal = ({
  weddingId,
  existingContractorToken,
  existingContractorPassword,
  initialSettings,
  onClose,
  onSave,
}: ContractorManagementModalProps) => {
  const isPasswordConfigured = !!existingContractorPassword;
  const [step, setStep] = useState<'settings' | 'documents'>(isPasswordConfigured ? 'settings' : 'settings');
  const [contractorPassword, setContractorPassword] = useState('');
  const [contractorLink, setContractorLink] = useState<string>(
    existingContractorToken ? `${window.location.origin}/contractor/${existingContractorToken}` : ''
  );

  const [settingsData, setSettingsData] = useState({
    dressCode: initialSettings?.dressCode || '',
    organizerContacts: 'Yulia Solodchenko\n0671271323\nTelegram - @Yuliia_Solodchenko',
  });

  // Parse initial coordinators from text format
  const parseCoordinators = (text: string): Coordinator[] => {
    if (!text) return [];
    const lines = text.split('\n').filter(line => line.trim());
    const coordinators: Coordinator[] = [];
    let current: Partial<Coordinator> = { id: Date.now().toString() };
    
    for (const line of lines) {
      if (line.toLowerCase().includes('phone:') || line.toLowerCase().includes('телефон:')) {
        current.phone = line.split(':')[1]?.trim() || '';
      } else if (line.toLowerCase().includes('telegram:') || line.toLowerCase().includes('tg')) {
        current.telegram = line.split(/tg|telegram/i)[1]?.trim().replace(/[:-]/g, '').trim() || '';
      } else if (!current.name) {
        current.name = line.trim();
      }
      
      if (current.name && current.phone && current.telegram) {
        coordinators.push(current as Coordinator);
        current = { id: (Date.now() + coordinators.length).toString() };
      }
    }
    
    return coordinators;
  };

  const formatCoordinators = (coordinators: Coordinator[]): string => {
    return coordinators
      .map(coord => `${coord.name}\nPhone: ${coord.phone}\nTelegram: ${coord.telegram}`)
      .join('\n\n');
  };

  const [coordinators, setCoordinators] = useState<Coordinator[]>(
    parseCoordinators(initialSettings?.coordinatorContacts || '')
  );

  const [documents, setDocuments] = useState<ContractorDocument[]>([]);
  const [newDocument, setNewDocument] = useState({
    name_en: '',
    name_ru: '',
    name_ua: '',
    link: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (existingContractorToken) {
      void loadDocuments();
    }
  }, [existingContractorToken]);

  const loadDocuments = async () => {
    const { documents: docs, error: err } = await contractorService.getContractorDocuments(weddingId);
    if (err) {
      setError(err);
      return;
    }
    setDocuments(docs);
  };

  const handleCopyLink = async () => {
    if (!contractorLink) {
      return;
    }
    await navigator.clipboard.writeText(contractorLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveSettings = async () => {
    setError(null);

    if (!isPasswordConfigured && contractorPassword.trim().length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    const coordinatorText = formatCoordinators(coordinators);

    if (isPasswordConfigured) {
      const { error: err } = await contractorService.updateContractorSettings(weddingId, {
        dressCode: settingsData.dressCode,
        organizerContacts: settingsData.organizerContacts,
        coordinatorContacts: coordinatorText,
      });

      setLoading(false);

      if (err) {
        setError(err);
        return;
      }

      // Don't close modal, switch to documents tab instead
      setStep('documents');
      onSave();
      return;
    }

    const { token, error: err } = await contractorService.setupContractorAccess(weddingId, contractorPassword, {
      dressCode: settingsData.dressCode,
      organizerContacts: settingsData.organizerContacts,
      coordinatorContacts: coordinatorText,
    });

    setLoading(false);

    if (err || !token) {
      setError(err || 'Failed to create contractor access');
      return;
    }

    const accessLink = `${window.location.origin}/contractor/${token}`;
    setContractorLink(accessLink);
    setStep('documents');
    onSave();
  };

  const handleAddDocument = async () => {
    if (!newDocument.link || (!newDocument.name_en && !newDocument.name_ru && !newDocument.name_ua)) {
      setError('Document name and link are required');
      return;
    }

    setLoading(true);
    setError(null);

    const { document: doc, error: err } = await contractorService.addContractorDocument(weddingId, {
      name_en: newDocument.name_en,
      name_ru: newDocument.name_ru,
      name_ua: newDocument.name_ua,
      link: newDocument.link,
    });

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    if (doc) {
      setDocuments([...documents, doc]);
      setNewDocument({ name_en: '', name_ru: '', name_ua: '', link: '' });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setLoading(true);
    const { error: err } = await contractorService.deleteContractorDocument(docId);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setDocuments(documents.filter((d) => d.id !== docId));
  };

  const handleFinish = () => {
    onSave();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
      style={{ animation: 'modal-backdrop-fade-in 0.3s ease-out forwards' }}
    >
      <div
        className="bg-[#FBF9F5] border border-[#00000033] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {isPasswordConfigured ? 'Contractor Access' : 'Create Contractor Access'}
            </h2>
            <button
              onClick={onClose}
              className="text-[#00000080] hover:text-black transition-colors cursor-pointer text-2xl font-light"
            >
              x
            </button>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center justify-center mb-6 space-x-4">
            <button
              type="button"
              onClick={() => setStep('settings')}
              className={`text-sm font-forum ${step === 'settings' ? 'font-bold text-black' : 'text-[#00000060] hover:text-black'} transition-colors`}
            >
              1. Settings
            </button>
            <div className="w-12 h-px bg-[#00000033]" />
            <button
              type="button"
              onClick={() => setStep('documents')}
              disabled={!isPasswordConfigured && !contractorLink}
              className={`text-sm font-forum ${step === 'documents' ? 'font-bold text-black' : 'text-[#00000060] hover:text-black'} transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              2. Documents
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] font-forum text-red-600">{error}</p>
            </div>
          )}

          {step === 'settings' && (
            <div className="space-y-4">
              {!isPasswordConfigured && (
                <div>
                  <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                    Access Password *
                  </label>
                  <input
                    type="text"
                    value={contractorPassword}
                    onChange={(e) => setContractorPassword(e.target.value)}
                    placeholder="Enter password for contractors"
                    className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white"
                  />
                  <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                    This password will be requested when opening the contractor link.
                  </p>
                </div>
              )}

              {isPasswordConfigured && contractorLink && (
                <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[14px] font-forum font-bold text-black mb-2">Contractor Link</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contractorLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum text-sm"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Dress Code
                </label>
                <textarea
                  value={settingsData.dressCode}
                  onChange={(e) => setSettingsData({ ...settingsData, dressCode: e.target.value })}
                  placeholder="e.g., Black Tie / Formal Evening Dress"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black">
                    Coordinators
                  </label>
                  <button
                    type="button"
                    onClick={() => setCoordinators([...coordinators, { id: Date.now().toString(), name: '', phone: '', telegram: '' }])}
                    className="px-3 py-1 bg-black text-white rounded-lg font-forum text-[13px] hover:bg-[#000000DD] transition-colors"
                  >
                    + Add Coordinator
                  </button>
                </div>
                
                {coordinators.length === 0 ? (
                  <p className="text-[14px] text-[#00000060] font-forum italic py-2">No coordinators added</p>
                ) : (
                  <div className="space-y-3">
                    {coordinators.map((coordinator, index) => (
                      <div key={coordinator.id} className="border border-[#00000033] rounded-lg p-3 bg-[#FAFAFA]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[13px] font-forum font-bold text-[#00000080]">Coordinator {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setCoordinators(coordinators.filter(c => c.id !== coordinator.id))}
                            className="text-red-600 hover:text-red-800 font-forum text-[13px]"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            placeholder="Name"
                            value={coordinator.name}
                            onChange={(e) => {
                              const updated = coordinators.map(c =>
                                c.id === coordinator.id ? { ...c, name: e.target.value } : c
                              );
                              setCoordinators(updated);
                            }}
                            className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px]"
                          />
                          <input
                            type="tel"
                            placeholder="Phone (e.g., 0671271323)"
                            value={coordinator.phone}
                            onChange={(e) => {
                              const updated = coordinators.map(c =>
                                c.id === coordinator.id ? { ...c, phone: e.target.value } : c
                              );
                              setCoordinators(updated);
                            }}
                            className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px]"
                          />
                          <input
                            type="text"
                            placeholder="Telegram (e.g., @username)"
                            value={coordinator.telegram}
                            onChange={(e) => {
                              const updated = coordinators.map(c =>
                                c.id === coordinator.id ? { ...c, telegram: e.target.value } : c
                              );
                              setCoordinators(updated);
                            }}
                            className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-[14px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-[#00000033] rounded-lg font-forum hover:bg-[#00000010] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={loading}
                  className="px-6 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#000000DD] transition-colors disabled:opacity-50"
                >'Save & 
                  {loading ? 'Saving...' : isPasswordConfigured ? 'Save' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {step === 'documents' && (
            <div className="space-y-6">
              {contractorLink && (
                <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[14px] font-forum font-bold text-black mb-2">Contractor Link</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contractorLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum text-sm"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[20px] font-forum font-bold text-black mb-3">Add Documents</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newDocument.name_en}
                      onChange={(e) => setNewDocument({ ...newDocument, name_en: e.target.value })}
                      placeholder="Name (EN)"
                      className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-sm"
                    />
                    <input
                      type="text"
                      value={newDocument.name_ru}
                      onChange={(e) => setNewDocument({ ...newDocument, name_ru: e.target.value })}
                      placeholder="Name (RU)"
                      className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-sm"
                    />
                    <input
                      type="text"
                      value={newDocument.name_ua}
                      onChange={(e) => setNewDocument({ ...newDocument, name_ua: e.target.value })}
                      placeholder="Name (UA)"
                      className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newDocument.link}
                      onChange={(e) => setNewDocument({ ...newDocument, link: e.target.value })}
                      placeholder="https://docs.google.com/..."
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddDocument()}
                      disabled={loading}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#000000DD] transition-colors disabled:opacity-50 text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {documents.length > 0 && (
                <div>
                  <h3 className="text-[18px] font-forum font-bold text-black mb-3">Documents ({documents.length})</h3>
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between p-3 border border-[#00000033] rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-forum text-sm font-bold">
                            {doc.name_en || doc.name_ru || doc.name_ua || doc.name}
                          </p>
                          <a
                            href={doc.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-forum text-[#00000080] hover:text-black underline break-all"
                          >
                            {doc.link}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDocument(doc.id)}
                          className="ml-3 text-red-600 hover:text-red-800 font-forum text-sm"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#000000DD] transition-colors"
                >
                  Finish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorManagementModal;
