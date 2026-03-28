import { useEffect, useState } from 'react';
import type { ContractorDocument } from '../../types';
import { contractorService } from '../../services/contractorService';

type Language = 'en' | 'ru' | 'ua';

type LocalizedText = Record<Language, string>;

interface OrganizerContacts {
  phone: string;
  names: LocalizedText;
}

interface CoordinatorItem {
  id: string;
  name: LocalizedText;
  responsibility: LocalizedText;
  phone: string;
}

interface ContractorManagementModalProps {
  weddingId: string;
  existingContractorToken?: string | null;
  existingContractorPassword?: string | null;
  /** Открытый пароль с сервера — показываем в инпуте только организатору */
  initialContractorPasswordPlain?: string | null;
  initialSettings?: {
    dressCode?: string;
    organizerContacts?: string;
    coordinatorContacts?: string;
    venueAddress?: string;
    mapsUrl?: string;
  };
  onClose: () => void;
  onSave: () => void;
}

const ContractorManagementModal = ({
  weddingId,
  existingContractorToken,
  existingContractorPassword,
  initialContractorPasswordPlain,
  initialSettings,
  onClose,
  onSave,
}: ContractorManagementModalProps) => {
  const isPasswordConfigured = !!existingContractorPassword;
  const [step, setStep] = useState<'settings' | 'documents'>(isPasswordConfigured ? 'settings' : 'settings');
  const [contractorPassword, setContractorPassword] = useState(initialContractorPasswordPlain ?? '');
  const [contractorLink, setContractorLink] = useState<string>(
    existingContractorToken ? `${window.location.origin}/contractor/${existingContractorToken}` : ''
  );

  const tryParseJson = <T,>(value?: string | null): T | null => {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  const emptyLocalizedText: LocalizedText = { en: '', ru: '', ua: '' };

  const parseOrganizerContacts = (value?: string | null): OrganizerContacts => {
    const parsed = tryParseJson<Partial<OrganizerContacts> & { names?: Partial<LocalizedText> }>(value);
    if (parsed?.names) {
      return {
        phone: parsed.phone || '',
        names: {
          en: parsed.names.en || '',
          ru: parsed.names.ru || '',
          ua: parsed.names.ua || '',
        },
      };
    }

    // Backward compatibility: old format was a plain text block.
    // We can only best-effort fill RU name + phone.
    const lines = (value || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const firstNonEmpty = lines[0] || '';
    const phoneLine = lines.find((l) => /тел|phone/i.test(l)) || lines.find((l) => /\+?\d[\d\s()-]{6,}/.test(l));
    const phone = phoneLine ? phoneLine.split(':').slice(1).join(':').trim() || phoneLine : '';

    return {
      phone,
      names: { ...emptyLocalizedText, ru: firstNonEmpty },
    };
  };

  const parseCoordinators = (value?: string | null): CoordinatorItem[] => {
    const parsed = tryParseJson<{ items?: Array<any> }>(value);
    if (parsed?.items && Array.isArray(parsed.items)) {
      return parsed.items.map((item, idx) => {
        const names = item?.name || {};
        const responsibility = item?.responsibility || {};
        return {
          id: `${Date.now()}_${idx}`,
          name: {
            en: names.en || '',
            ru: names.ru || '',
            ua: names.ua || '',
          },
          responsibility: {
            en: responsibility.en || '',
            ru: responsibility.ru || '',
            ua: responsibility.ua || '',
          },
          phone: item?.phone || '',
        };
      });
    }

    // Backward compatibility: old format was "name\nPhone: ...\nTelegram: ..."
    // We keep name (as RU) + phone, responsibility will be empty.
    if (!value) return [];
    const blocks = value
      .split(/\n\s*\n/g)
      .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
      .filter((b) => b.length > 0);

    return blocks.map((lines, idx) => {
      const name = lines.find((l) => !/phone:|telegram:|телефон:|telegram/i.test(l)) || '';
      const phoneLine =
        lines.find((l) => /phone:|телефон:|тел:|tel:/i.test(l)) ||
        lines.find((l) => /\+?\d[\d\s()-]{6,}/.test(l)) ||
        '';
      const phone = phoneLine ? phoneLine.split(':').slice(1).join(':').trim() || phoneLine : '';

      return {
        id: `${Date.now()}_${idx}`,
        name: { ...emptyLocalizedText, ru: name },
        responsibility: emptyLocalizedText,
        phone,
      };
    });
  };

  const defaultOrganizerContacts: OrganizerContacts = {
    phone: '+380 67 127 13 23',
    names: {
      ua: 'Юлія Солодченко',
      en: 'Julia Solodchenko',
      ru: 'Юлия Солодченко',
    },
  };

  const [settingsData, setSettingsData] = useState<{
    dressCode: string;
    organizerContacts: OrganizerContacts;
  }>({
    dressCode: initialSettings?.dressCode || '',
    organizerContacts: initialSettings?.organizerContacts
      ? parseOrganizerContacts(initialSettings.organizerContacts)
      : defaultOrganizerContacts,
  });

  const [isEditingOrganizerContacts, setIsEditingOrganizerContacts] = useState(false);

  const [coordinators, setCoordinators] = useState<CoordinatorItem[]>(
    parseCoordinators(initialSettings?.coordinatorContacts)
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

  const [venueAddress, setVenueAddress] = useState(initialSettings?.venueAddress || '');
  const [mapsUrl, setMapsUrl] = useState(initialSettings?.mapsUrl || '');

  useEffect(() => {
    setVenueAddress(initialSettings?.venueAddress || '');
    setMapsUrl(initialSettings?.mapsUrl || '');
  }, [initialSettings?.venueAddress, initialSettings?.mapsUrl]);

  useEffect(() => {
    setContractorPassword(initialContractorPasswordPlain ?? '');
  }, [initialContractorPasswordPlain]);

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

    const newPassword = contractorPassword.trim();
    const isPasswordProvided = newPassword.length > 0;

    if (!isPasswordConfigured && !isPasswordProvided) {
      setError('Введите пароль для подрядчиков');
      return;
    }

    if (isPasswordProvided && newPassword.length < 4) {
      setError('Пароль должен быть минимум 4 символа');
      return;
    }

    setLoading(true);

    const organizerContactsPayload = JSON.stringify(settingsData.organizerContacts);
    const coordinatorContactsPayload = JSON.stringify({
      items: coordinators.map((c) => ({
        name: c.name,
        responsibility: c.responsibility,
        phone: c.phone,
      })),
    });

    // Если пароль уже настроен и пользователь НЕ ввёл новый пароль — сохраняем только настройки.
    if (isPasswordConfigured && !isPasswordProvided) {
      const { error: err } = await contractorService.updateContractorSettings(weddingId, {
        dressCode: settingsData.dressCode,
        organizerContacts: organizerContactsPayload,
        coordinatorContacts: coordinatorContactsPayload,
        venueAddress,
        mapsUrl,
      });

      setLoading(false);

      if (err) {
        setError(err);
        return;
      }

      setStep('documents');
      onSave();
      return;
    }

    // Если пароль не был настроен или пользователь ввёл новый пароль — пересоздаём доступ.
    const { token, error: err } = await contractorService.setupContractorAccess(weddingId, newPassword, {
      dressCode: settingsData.dressCode,
      organizerContacts: organizerContactsPayload,
      coordinatorContacts: coordinatorContactsPayload,
      venueAddress,
      mapsUrl,
    });

    setLoading(false);

    if (err || !token) {
      setError(err || 'Не удалось создать доступ для подрядчиков');
      return;
    }

    const accessLink = `${window.location.origin}/contractor/${token}`;
    setContractorLink(accessLink);
    setStep('documents');
    onSave();
  };

  const handleAddDocument = async () => {
    const hasAnyName = Boolean(newDocument.name_en.trim() || newDocument.name_ru.trim() || newDocument.name_ua.trim());
    if (!newDocument.link || !hasAnyName) {
      setError('Введите название документа (хотя бы на одном языке) и ссылку');
      return;
    }

    setLoading(true);
    setError(null);

    const { document: doc, error: err } = await contractorService.addContractorDocument(weddingId, {
      name: newDocument.name_ru || newDocument.name_en || newDocument.name_ua,
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
        className="bg-[#eae6db] border border-[#00000033] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modal-content-scale-in 0.3s ease-out forwards' }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[32px] max-[1599px]:text-[24px] font-forum font-bold text-black">
              {isPasswordConfigured ? 'Доступ для подрядчиков' : 'Создать доступ для подрядчиков'}
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
              1. Настройки
            </button>
            <div className="w-12 h-px bg-[#00000033]" />
            <button
              type="button"
              onClick={() => setStep('documents')}
              disabled={!contractorLink}
              className={`text-sm font-forum ${step === 'documents' ? 'font-bold text-black' : 'text-[#00000060] hover:text-black'} transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              2. Документы
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] font-forum text-red-600">{error}</p>
            </div>
          )}

          {step === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Пароль подрядчиков
                </label>
                <input
                  type="text"
                  value={contractorPassword}
                  onChange={(e) => setContractorPassword(e.target.value)}
                  placeholder={isPasswordConfigured ? 'Введите новый пароль (или оставьте пустым)' : 'Введите пароль'}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db]"
                />
                <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                  {isPasswordConfigured
                    ? 'Если введете новый пароль — он будет обновлен. Оставьте пустым, чтобы не менять.'
                    : 'Этот пароль будет запрошен при открытии ссылки для подрядчиков.'}
                </p>
              </div>

              {isPasswordConfigured && contractorLink && (
                <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[14px] font-forum font-bold text-black mb-2">Ссылка для подрядчиков</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contractorLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-[#eae6db] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum text-sm"
                    >
                      {copied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Дресс-код
                </label>
                <textarea
                  value={settingsData.dressCode}
                  onChange={(e) => setSettingsData({ ...settingsData, dressCode: e.target.value })}
                  placeholder="например: Black Tie / Formal Evening Dress"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] resize-none"
                />
              </div>

              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Точный адрес места
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="улица, дом, город"
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                />
              </div>

              <div>
                <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black mb-1">
                  Ссылка на Google Maps
                </label>
                <input
                  type="url"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                />
                <p className="text-[12px] font-forum font-light text-[#00000080] mt-1">
                  У подрядчика адрес будет ссылкой на карту (откроется в новой вкладке).
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black">
                    Контакты организатора
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditingOrganizerContacts((v) => !v)}
                    className="px-3 py-1 bg-black text-white rounded-lg font-forum text-[13px] hover:bg-[#000000DD] transition-colors"
                  >
                    {isEditingOrganizerContacts ? 'Готово' : 'Изменить'}
                  </button>
                </div>
                {!isEditingOrganizerContacts ? (
                  <pre className="w-full px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-[#eae6db] whitespace-pre-wrap text-sm">
                    RU: {settingsData.organizerContacts.names.ru}
                    {'\n'}
                    UA: {settingsData.organizerContacts.names.ua}
                    {'\n'}
                    EN: {settingsData.organizerContacts.names.en}
                    {'\n'}
                    Телефон: {settingsData.organizerContacts.phone}
                  </pre>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={settingsData.organizerContacts.names.ua}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            organizerContacts: {
                              ...settingsData.organizerContacts,
                              names: { ...settingsData.organizerContacts.names, ua: e.target.value },
                            },
                          })
                        }
                        placeholder="Имя (UA)"
                        className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                      />
                      <input
                        type="text"
                        value={settingsData.organizerContacts.names.en}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            organizerContacts: {
                              ...settingsData.organizerContacts,
                              names: { ...settingsData.organizerContacts.names, en: e.target.value },
                            },
                          })
                        }
                        placeholder="Имя (EN)"
                        className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                      />
                      <input
                        type="text"
                        value={settingsData.organizerContacts.names.ru}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            organizerContacts: {
                              ...settingsData.organizerContacts,
                              names: { ...settingsData.organizerContacts.names, ru: e.target.value },
                            },
                          })
                        }
                        placeholder="Имя (RU)"
                        className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                      />
                    </div>

                    <input
                      type="tel"
                      value={settingsData.organizerContacts.phone}
                      onChange={(e) =>
                        setSettingsData({
                          ...settingsData,
                          organizerContacts: { ...settingsData.organizerContacts, phone: e.target.value },
                        })
                      }
                      placeholder="+380 ..."
                      className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[16px] max-[1599px]:text-[14px] font-forum font-bold text-black">
                    Координаторы
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCoordinators([
                        ...coordinators,
                        {
                          id: Date.now().toString(),
                          name: emptyLocalizedText,
                          responsibility: emptyLocalizedText,
                          phone: '',
                        },
                      ])
                    }
                    className="px-3 py-1 bg-black text-white rounded-lg font-forum text-[13px] hover:bg-[#000000DD] transition-colors"
                  >
                    + Добавить координатора
                  </button>
                </div>
                
                {coordinators.length === 0 ? (
                  <p className="text-[14px] text-[#00000060] font-forum italic py-2">Координаторов пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {coordinators.map((coordinator, index) => (
                      <div key={coordinator.id} className="border border-[#00000033] rounded-lg p-3 bg-[#eae6db]">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[13px] font-forum font-bold text-[#00000080]">Координатор {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setCoordinators(coordinators.filter(c => c.id !== coordinator.id))}
                            className="text-red-600 hover:text-red-800 font-forum text-[13px]"
                          >
                            Удалить
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Имя (UA)"
                              value={coordinator.name.ua}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id ? { ...c, name: { ...c.name, ua: e.target.value } } : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                            <input
                              type="text"
                              placeholder="Имя (EN)"
                              value={coordinator.name.en}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id ? { ...c, name: { ...c.name, en: e.target.value } } : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                            <input
                              type="text"
                              placeholder="Имя (RU)"
                              value={coordinator.name.ru}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id ? { ...c, name: { ...c.name, ru: e.target.value } } : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Зона ответственности (UA)"
                              value={coordinator.responsibility.ua}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id
                                    ? { ...c, responsibility: { ...c.responsibility, ua: e.target.value } }
                                    : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                            <input
                              type="text"
                              placeholder="Зона ответственности (EN)"
                              value={coordinator.responsibility.en}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id
                                    ? { ...c, responsibility: { ...c.responsibility, en: e.target.value } }
                                    : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                            <input
                              type="text"
                              placeholder="Зона ответственности (RU)"
                              value={coordinator.responsibility.ru}
                              onChange={(e) => {
                                const updated = coordinators.map((c) =>
                                  c.id === coordinator.id
                                    ? { ...c, responsibility: { ...c.responsibility, ru: e.target.value } }
                                    : c
                                );
                                setCoordinators(updated);
                              }}
                              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
                            />
                          </div>

                          <input
                            type="tel"
                            placeholder="Номер телефона"
                            value={coordinator.phone}
                            onChange={(e) => {
                              const updated = coordinators.map((c) =>
                                c.id === coordinator.id ? { ...c, phone: e.target.value } : c
                              );
                              setCoordinators(updated);
                            }}
                            className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-[14px]"
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
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveSettings()}
                  disabled={loading}
                  className="px-6 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#000000DD] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : isPasswordConfigured ? 'Сохранить' : 'Далее'}
                </button>
              </div>
            </div>
          )}

          {step === 'documents' && (
            <div className="space-y-6">
              {contractorLink && (
                <div className="bg-[#eae6db] border border-[#00000033] rounded-lg p-4">
                  <p className="text-[14px] font-forum font-bold text-black mb-2">Ссылка для подрядчиков</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contractorLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg font-forum bg-[#eae6db] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum text-sm"
                    >
                      {copied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[20px] font-forum font-bold text-black mb-3">Добавить документы</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newDocument.name_en}
                      onChange={(e) => setNewDocument({ ...newDocument, name_en: e.target.value })}
                      placeholder="Название (EN)"
                      className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-sm"
                    />
                    <input
                      type="text"
                      value={newDocument.name_ru}
                      onChange={(e) => setNewDocument({ ...newDocument, name_ru: e.target.value })}
                      placeholder="Название (RU)"
                      className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-sm"
                    />
                    <input
                      type="text"
                      value={newDocument.name_ua}
                      onChange={(e) => setNewDocument({ ...newDocument, name_ua: e.target.value })}
                      placeholder="Название (UA)"
                      className="w-full px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newDocument.link}
                      onChange={(e) => setNewDocument({ ...newDocument, link: e.target.value })}
                      placeholder="https://docs.google.com/..."
                      className="flex-1 px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:border-black font-forum bg-[#eae6db] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddDocument()}
                      disabled={loading}
                      className="px-4 py-2 bg-black text-white rounded-lg font-forum hover:bg-[#000000DD] transition-colors disabled:opacity-50 text-sm"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              </div>

              {documents.length > 0 && (
                <div>
                  <h3 className="text-[18px] font-forum font-bold text-black mb-3">Документы ({documents.length})</h3>
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between p-3 border border-[#00000033] rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-forum text-sm font-bold">
                            {doc.name_ru || doc.name || doc.name_en || doc.name_ua}
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
                          Удалить
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
                  Готово
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
