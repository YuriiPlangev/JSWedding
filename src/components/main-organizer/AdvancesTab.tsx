import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { advanceService } from '../../services/weddingService';
import type { Event, Advance } from '../../types';
import { getTotalInAllCurrencies, formatCurrencyAmount, type Currency } from '../../utils/currencyConverter';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Toast from '../Toast';

// Инициализация шрифтов для pdfmake
(pdfMake as any).vfs = pdfFonts;

const AdvancesTab = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
  const [showNewEventInput, setShowNewEventInput] = useState(false);
  const newEventInputRef = useRef<HTMLInputElement>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [totals, setTotals] = useState<{ грн: number; доллар: number; евро: number }>({ грн: 0, доллар: 0, евро: 0 });
  const [showToast, setShowToast] = useState(false);
  const [changedFields, setChangedFields] = useState<Record<string, Set<string>>>({});

  const loadEvents = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await advanceService.getEvents(user.id);
    setEvents(data);
    if (data.length > 0 && !selectedEventId) {
      setSelectedEventId(data[0].id);
    }
    setLoading(false);
  };

  const loadAdvances = useCallback(async (eventId: string) => {
    const data = await advanceService.getAdvancesByEvent(eventId);
    setAdvances(data);
        // Обновляем итоги
        if (data.length > 0) {
          const totals = await getTotalInAllCurrencies(
            data.map(a => ({ amount: a.amount, currency: (a.currency || 'доллар') as Currency }))
          );
          setTotals(totals);
        } else {
          setTotals({ грн: 0, доллар: 0, евро: 0 });
        }
  }, []);

  // Загружаем ивенты
  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  // Загружаем авансы при выборе ивента
  useEffect(() => {
    if (selectedEventId) {
      loadAdvances(selectedEventId);
    } else {
      setAdvances([]);
    }
  }, [selectedEventId, loadAdvances]);

  const handleCreateEvent = async () => {
    if (!user?.id || !newEventName.trim()) return;
    
    const event = await advanceService.createEvent(user.id, newEventName.trim());
    if (event) {
      setEvents(prev => [event, ...prev]);
      setSelectedEventId(event.id);
      setNewEventName('');
      setShowNewEventInput(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот ивент? Все авансы будут удалены.')) {
      return;
    }

    const success = await advanceService.deleteEvent(eventId);
    if (success) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      if (selectedEventId === eventId) {
        setSelectedEventId(events.find(e => e.id !== eventId)?.id || null);
      }
    }
  };

  const handleRenameEvent = async (eventId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = await advanceService.updateEvent(eventId, newName.trim());
    if (updated) {
      setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
    }
  };

  const addRow = async () => {
    if (!selectedEventId) return;
    
    const newAdvance: Omit<Advance, 'id' | 'created_at' | 'updated_at'> = {
      event_id: selectedEventId,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      purpose: null,
      payment_method: 'карта',
      currency: 'доллар',
    };

    await handleCreateAdvance(newAdvance);
  };

  const handleCreateAdvance = async (advance: Omit<Advance, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await advanceService.createAdvance(advance);
    if (created) {
      setAdvances(prev => [...prev, created]);
    }
  };

  // Функция для парсинга числа из строки
  const parseNumber = useCallback((value: string): number => {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Форматирование числа для отображения
  const formatNumber = useCallback((value: number): string => {
    if (value === null || value === undefined || isNaN(value) || value === 0) return '';
    return value.toString();
  }, []);

  // Обновление UI сразу, без сохранения
  const handleUpdateAdvance = useCallback((id: string, field: keyof Omit<Advance, 'id' | 'created_at' | 'updated_at'>, value: string | number | null) => {
    // Находим текущее значение для сравнения
    const advance = advances.find(a => a.id === id);
    if (!advance) return;

    const currentValue = advance[field];
    
    // Проверяем, действительно ли изменилось значение
    const hasChanged = currentValue !== value;
    
    // Обновляем отслеживание изменений
    if (hasChanged) {
      setChangedFields(prev => ({
        ...prev,
        [id]: new Set([...(prev[id] || []), field])
      }));
    } else {
      // Если значение вернулось к исходному, удаляем из отслеживания
      setChangedFields(prev => {
        const updated = { ...prev };
        if (updated[id]) {
          updated[id].delete(field);
          if (updated[id].size === 0) {
            delete updated[id];
          }
        }
        return updated;
      });
    }

    setAdvances(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  }, [advances]);

  // Сохранение всей строки сразу
  const handleSaveRow = useCallback(async (id: string) => {
    // Проверяем, были ли изменения в этой строке
    if (!changedFields[id] || changedFields[id].size === 0) {
      return;
    }

    const advance = advances.find(a => a.id === id);
    if (!advance) return;

    const updateData: Partial<Omit<Advance, 'id' | 'created_at' | 'updated_at'>> = {
      date: advance.date,
      amount: typeof advance.amount === 'number' ? advance.amount : parseNumber(String(advance.amount || 0)),
      purpose: advance.purpose || null,
      payment_method: advance.payment_method,
      currency: advance.currency || 'доллар',
    };

    try {
      const updated = await advanceService.updateAdvance(id, updateData);
      if (updated) {
        setAdvances(prev => {
          const newAdvances = prev.map(a => a.id === id ? updated : a);
          // Обновляем итоги
          getTotalInAllCurrencies(
            newAdvances.map(a => ({ amount: a.amount, currency: (a.currency || 'доллар') as Currency }))
          ).then(totals => setTotals(totals));
          return newAdvances;
        });
        
        // Очищаем отслеживание изменений после успешного сохранения
        setChangedFields(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        setShowToast(true);
      } else {
        console.error('Ошибка сохранения');
        loadAdvances(selectedEventId || '');
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      loadAdvances(selectedEventId || '');
    }
  }, [advances, selectedEventId, parseNumber, loadAdvances, changedFields]);

  const handleDeleteAdvance = async (id: string) => {
    if (!confirm('Вы точно хотите удалить этот аванс?')) {
      return;
    }
    const success = await advanceService.deleteAdvance(id);
    if (success) {
      setAdvances(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedEventId || advances.length === 0) return;

    const selectedEvent = events.find(e => e.id === selectedEventId);
    
    // Подготовка данных таблицы
    const tableBody = advances.map(advance => [
      advance.date || '',
      advance.amount.toString() || '0',
      advance.purpose || '',
      advance.payment_method || '',
    ]);

    // Вычисляем итоги по валютам
    const totals = await getTotalInAllCurrencies(
      advances.map(a => ({ amount: a.amount, currency: (a.currency || 'доллар') as Currency }))
    );

    tableBody.push(['ИТОГО', '', '', '']);

    // Создание документа pdfmake
    const docDefinition = {
      content: [
        {
          text: selectedEvent ? selectedEvent.name : 'Авансы',
          style: 'header',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', '*', 'auto'],
            body: [
              [
                { text: 'Дата внесения аванса', style: 'tableHeader' },
                { text: 'Внесенная сумма', style: 'tableHeader' },
                { text: 'Комментарии', style: 'tableHeader' },
                { text: 'Способ оплаты', style: 'tableHeader' },
              ],
              ...tableBody.map((row, index) => {
                const isTotal = index === tableBody.length - 1;
                return [
                  row[0],
                  { text: row[1], alignment: 'right', bold: isTotal },
                  row[2],
                  row[3],
                ];
              }),
            ],
          },
          layout: 'lightGridLines',
        },
        {
          text: 'Итого:',
          style: 'totalHeader',
          margin: [0, 10, 0, 5],
        },
        {
          text: `USD: ${formatCurrencyAmount(totals.доллар)}`,
          style: 'totalText',
          margin: [0, 0, 0, 3],
        },
        {
          text: `EUR: ${formatCurrencyAmount(totals.евро)}`,
          style: 'totalText',
          margin: [0, 0, 0, 3],
        },
        {
          text: `грн: ${formatCurrencyAmount(totals.грн)}`,
          style: 'totalText',
          margin: [0, 0, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: 'white',
          fillColor: '#000000',
        },
        totalHeader: {
          fontSize: 12,
          bold: true,
        },
        totalText: {
          fontSize: 10,
        },
      },
      defaultStyle: {
        fontSize: 10,
        font: 'Roboto',
      },
    };

    const fileName = selectedEvent ? `${selectedEvent.name}_авансы.pdf` : 'авансы.pdf';
    pdfMake.createPdf(docDefinition).download(fileName);
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#00000033] rounded-lg p-8 text-center">
        <p className="text-gray-600 font-forum">Загрузка...</p>
      </div>
    );
  }

  return (
    <>
      <Toast message="Сохранено" show={showToast} onClose={() => setShowToast(false)} />
      <div className="bg-white border border-[#00000033] rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-forum font-bold">Авансы</h2>
        {selectedEventId && (
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
          >
            Скачать PDF
          </button>
        )}
      </div>

      {/* Вкладки с ивентами */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => {
              if (editingEventId !== event.id) {
                setSelectedEventId(event.id);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedEventId === event.id
                ? 'bg-[#eae6db] text-black shadow-md'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            {editingEventId === event.id ? (
              <input
                type="text"
                value={editEventName}
                onChange={(e) => setEditEventName(e.target.value)}
                onBlur={async () => {
                  if (!editEventName.trim()) {
                    setEditEventName(event.name);
                  } else if (editEventName.trim() !== event.name) {
                    await handleRenameEvent(event.id, editEventName.trim());
                  }
                  setEditingEventId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setEditEventName(event.name);
                    setEditingEventId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-[100px] px-2 py-1 border border-gray-300 rounded bg-white text-black focus:ring-2 focus:ring-blue-500 focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px]"
                autoFocus
              />
            ) : (
              <>
                <span 
                  className="flex-1 min-w-[100px] font-forum text-[14px] max-[1599px]:text-[13px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingEventId(event.id);
                    setEditEventName(event.name);
                  }}
                >
                  {event.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(event.id);
                  }}
                  className={`text-[18px] font-bold hover:scale-110 transition-transform ${
                    selectedEventId === event.id ? 'text-red-600 hover:text-red-700' : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
        
        {showNewEventInput ? (
          <div className="flex items-center gap-2">
            <input
              ref={newEventInputRef}
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateEvent();
                } else if (e.key === 'Escape') {
                  setShowNewEventInput(false);
                  setNewEventName('');
                }
              }}
              onBlur={() => {
                if (!newEventName.trim()) {
                  setShowNewEventInput(false);
                }
              }}
              placeholder="Название ивента"
              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px]"
              autoFocus
            />
            <button
              onClick={handleCreateEvent}
              className="px-3 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer font-forum text-[14px] max-[1599px]:text-[13px]"
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowNewEventInput(true);
              setTimeout(() => newEventInputRef.current?.focus(), 0);
            }}
            className="px-4 py-2 border border-[#00000033] border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum whitespace-nowrap"
          >
            + Новый ивент
          </button>
        )}
      </div>

      {/* Таблица авансов */}
      {selectedEventId ? (
        <div className="overflow-auto rounded-lg p-1.5">
          <table className="border-collapse w-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] sticky left-0 bg-gray-100 z-10 whitespace-nowrap">
                  Дата внесения аванса
                </th>
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                  Внесенная сумма
                </th>
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]" style={{ minWidth: '150px' }}>
                  Комментарии
                </th>
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                  Способ оплаты
                </th>
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] w-12">
                  💾
                </th>
                <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] w-12">
                  ✕
                </th>
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-[#00000033] px-3 py-8 text-center text-[#00000080] font-forum">
                    Нет данных. Нажмите "+ Добавить строку" чтобы начать.
                  </td>
                </tr>
              ) : (
                advances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-gray-50">
                    <td className="border border-[#00000033] p-0 sticky left-0 bg-white z-10">
                      <input
                        type="date"
                        value={advance.date}
                        onChange={(e) => handleUpdateAdvance(advance.id, 'date', e.target.value)}
                        onBlur={() => handleSaveRow(advance.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                            handleSaveRow(advance.id);
                          }
                        }}
                        className="w-full px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                      />
                    </td>
                    <td className="border border-[#00000033] p-0">
                      <div className="flex items-center gap-0">
                        <input
                          type="text"
                          value={formatNumber(advance.amount)}
                          onChange={(e) => {
                            const numValue = parseNumber(e.target.value);
                            handleUpdateAdvance(advance.id, 'amount', numValue);
                          }}
                          onBlur={() => {
                            handleSaveRow(advance.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                              handleSaveRow(advance.id);
                            }
                          }}
                          className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                          placeholder="0.00"
                          inputMode="decimal"
                        />
                        <select
                          value={advance.currency || 'доллар'}
                          onChange={async (e) => {
                            const newCurrency = e.target.value as Currency;
                            // Сразу обновляем UI
                            handleUpdateAdvance(advance.id, 'currency', newCurrency);
                            // Сохраняем в БД
                            const updateData = { currency: newCurrency };
                            const updated = await advanceService.updateAdvance(advance.id, updateData);
                            if (updated) {
                              // Обновляем состояние из ответа БД и итоги
                              setAdvances(prev => {
                                const newAdvances = prev.map(a => a.id === advance.id ? updated : a);
                                // Обновляем итоги с новыми данными
                                getTotalInAllCurrencies(
                                  newAdvances.map(a => ({ amount: a.amount, currency: (a.currency || 'доллар') as Currency }))
                                ).then(totals => setTotals(totals));
                                return newAdvances;
                              });
                              setShowToast(true);
                            } else {
                              // Если ошибка, перезагружаем данные
                              if (selectedEventId) {
                                loadAdvances(selectedEventId);
                              }
                            }
                          }}
                          className="px-0.5 py-0.5 -ml-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[16px] max-[1599px]:text-[15px] bg-transparent cursor-pointer min-w-[35px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="грн">грн</option>
                          <option value="доллар">$</option>
                          <option value="евро">€</option>
                        </select>
                      </div>
                    </td>
                    <td className="border border-[#00000033] p-0" style={{ minWidth: '150px', width: 'auto' }}>
                      <input
                        type="text"
                        value={advance.purpose || ''}
                        onChange={(e) => {
                          handleUpdateAdvance(advance.id, 'purpose', e.target.value);
                          const input = e.target;
                          // Создаем временный элемент для измерения ширины текста
                          const measure = document.createElement('span');
                          measure.style.visibility = 'hidden';
                          measure.style.position = 'absolute';
                          measure.style.whiteSpace = 'pre';
                          measure.style.font = window.getComputedStyle(input).font;
                          measure.textContent = input.value || input.placeholder;
                          document.body.appendChild(measure);
                          const textWidth = measure.offsetWidth;
                          document.body.removeChild(measure);
                          // Устанавливаем ширину input на основе реальной ширины текста
                          input.style.width = 'auto';
                          input.style.width = `${Math.max(150, Math.min(textWidth + 20, window.innerWidth * 0.5))}px`;
                        }}
                        onBlur={() => handleSaveRow(advance.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                            handleSaveRow(advance.id);
                          }
                        }}
                        className="px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                        placeholder="Комментарии"
                        style={{
                          minWidth: '150px',
                          width: 'auto'
                        }}
                        ref={(input) => {
                          if (input && advance.purpose) {
                            const measure = document.createElement('span');
                            measure.style.visibility = 'hidden';
                            measure.style.position = 'absolute';
                            measure.style.whiteSpace = 'pre';
                            measure.style.font = window.getComputedStyle(input).font;
                            measure.textContent = advance.purpose;
                            document.body.appendChild(measure);
                            const textWidth = measure.offsetWidth;
                            document.body.removeChild(measure);
                            input.style.width = 'auto';
                            input.style.width = `${Math.max(150, Math.min(textWidth + 20, window.innerWidth * 0.5))}px`;
                          }
                        }}
                      />
                    </td>
                    <td className="border border-[#00000033] p-0">
                      <select
                        value={advance.payment_method}
                        onChange={(e) => handleUpdateAdvance(advance.id, 'payment_method', e.target.value as 'крипта' | 'наличка' | 'карта')}
                        onBlur={() => handleSaveRow(advance.id)}
                        className="w-full px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent cursor-pointer"
                      >
                        <option value="карта">Карта</option>
                        <option value="наличка">Наличка</option>
                        <option value="крипта">Крипта</option>
                      </select>
                    </td>
                    <td className="border border-[#00000033] p-1.5 text-center">
                      <button
                        onClick={() => handleSaveRow(advance.id)}
                        className="text-black hover:text-[#1a1a1a] active:scale-95 cursor-pointer transition-all duration-200 text-[13px] max-[1599px]:text-[12px] font-forum"
                        title="Сохранить"
                      >
                        Сохранить
                      </button>
                    </td>
                    <td className="border border-[#00000033] p-1.5 text-center">
                      <button
                        onClick={() => handleDeleteAdvance(advance.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer text-[20px] font-bold"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[#00000033] rounded-lg p-8 text-center">
          <p className="text-[#00000080] font-forum">Создайте ивент, чтобы начать работу с авансами</p>
        </div>
      )}

      {selectedEventId && (
        <div className="mt-3">
          <div className="flex justify-between items-center">
            <button
              onClick={addRow}
              className="px-3 py-1.5 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
            >
              + Добавить строку
            </button>
            {advances.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                  <span className="font-semibold">Итого:</span>
                </div>
                <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                  <span>Грн: {formatCurrencyAmount(totals.грн)}</span>
                </div>
                <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                  <span>USD: {formatCurrencyAmount(totals.доллар)}</span>
                </div>
                <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                  <span>EUR: {formatCurrencyAmount(totals.евро)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdvancesTab;
