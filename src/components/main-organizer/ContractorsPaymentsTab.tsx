import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { contractorPaymentService, advanceService } from '../../services/weddingService';
import type { ContractorPayment, Event } from '../../types';
import { getTotalInAllCurrencies, formatCurrencyAmount, type Currency } from '../../utils/currencyConverter';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Toast from '../Toast';

// Инициализация шрифтов для pdfmake
(pdfMake as any).vfs = pdfFonts;

const ContractorsPaymentsTab = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [payments, setPayments] = useState<ContractorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
  const [showNewEventInput, setShowNewEventInput] = useState(false);
  const newEventInputRef = useRef<HTMLInputElement>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [totals, setTotals] = useState<{ грн: number; доллар: number; евро: number }>({ грн: 0, доллар: 0, евро: 0 });
  const [totalsByCurrency, setTotalsByCurrency] = useState<{ грн: number; доллар: number; евро: number }>({ грн: 0, доллар: 0, евро: 0 });
  const [showToast, setShowToast] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
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

  const loadPaymentsByEvent = useCallback(async (eventId: string) => {
    const data = await contractorPaymentService.getPaymentsByEvent(eventId);
    setPayments(data);
    // Обновляем итоги с конвертацией
    if (data.length > 0) {
      const totals = await getTotalInAllCurrencies(
        data.map(p => ({ 
          amount: p.to_pay || 0, 
          currency: (p.cost_currency || p.currency || 'евро') as Currency 
        }))
      );
      setTotals(totals);
      
      // Рассчитываем суммы по валютам без конвертации
      const byCurrency = { грн: 0, доллар: 0, евро: 0 };
      data.forEach(p => {
        const currency = (p.cost_currency || p.currency || 'евро') as Currency;
        const amount = p.to_pay || 0;
        if (currency === 'грн') {
          byCurrency.грн += amount;
        } else if (currency === 'доллар') {
          byCurrency.доллар += amount;
        } else if (currency === 'евро') {
          byCurrency.евро += amount;
        }
      });
      setTotalsByCurrency(byCurrency);
    } else {
      setTotals({ грн: 0, доллар: 0, евро: 0 });
      setTotalsByCurrency({ грн: 0, доллар: 0, евро: 0 });
    }
  }, []);

  // Загружаем ивенты
  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  // Загружаем оплаты при выборе ивента
  useEffect(() => {
    if (selectedEventId) {
      loadPaymentsByEvent(selectedEventId);
    } else {
      setPayments([]);
    }
  }, [selectedEventId, loadPaymentsByEvent]);

  // Обновляем итоги при изменении payments
  useEffect(() => {
    if (payments.length > 0) {
      getTotalInAllCurrencies(
        payments.map(p => ({ 
          amount: p.to_pay || 0, 
          currency: (p.cost_currency || p.currency || 'евро') as Currency 
        }))
      ).then(totals => setTotals(totals));
      
      // Рассчитываем суммы по валютам без конвертации
      const byCurrency = { грн: 0, доллар: 0, евро: 0 };
      payments.forEach(p => {
        const currency = (p.cost_currency || p.currency || 'евро') as Currency;
        const amount = p.to_pay || 0;
        if (currency === 'грн') {
          byCurrency.грн += amount;
        } else if (currency === 'доллар') {
          byCurrency.доллар += amount;
        } else if (currency === 'евро') {
          byCurrency.евро += amount;
        }
      });
      setTotalsByCurrency(byCurrency);
    } else {
      setTotals({ грн: 0, доллар: 0, евро: 0 });
      setTotalsByCurrency({ грн: 0, доллар: 0, евро: 0 });
    }
  }, [payments]);

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
    if (!confirm('Вы уверены, что хотите удалить этот ивент? Все оплаты будут удалены.')) {
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
    if (!user?.id || !selectedEventId) return;
    
    const newPayment: Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay' | 'order_index'> = {
      created_by: user.id,
      event_id: selectedEventId,
      service: '',
      cost: 0,
      cost_currency: 'евро',
      percent: 0,
      percent_currency: 'евро',
      advance: 0,
      advance_currency: 'евро',
      date: new Date().toISOString().split('T')[0],
      currency: 'евро', // Старое поле для обратной совместимости
      comment: null,
    };

    await handleCreatePayment(newPayment);
  };

  const handleCreatePayment = async (payment: Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay' | 'order_index'>) => {
    const created = await contractorPaymentService.createPayment(payment);
    if (created) {
      setPayments(prev => [...prev, created]);
    }
  };

  // Обновление UI сразу, без сохранения
  const handleUpdatePayment = useCallback((id: string, field: keyof ContractorPayment, value: string | number | Currency | null) => {
    // Находим текущее значение для сравнения
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    const currentValue = payment[field];
    
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

    // Оптимистичное обновление UI сразу (но БЕЗ пересчета to_pay)
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  }, [payments]);

  // Функция для парсинга числа из строки
  const parseNumber = useCallback((value: string): number => {
    // Убираем все пробелы и запятые, заменяем запятую на точку
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Форматирование числа для отображения
  const formatNumber = useCallback((value: number): string => {
    // Показываем пустую строку если значение null, undefined, NaN или 0
    if (value === null || value === undefined || isNaN(value) || value === 0) return '';
    // Показываем число
    return value.toString();
  }, []);

  // Сохранение в Supabase при потере фокуса
  // Сохранение всей строки сразу
  const handleSaveRow = useCallback(async (id: string) => {
    // Проверяем, были ли изменения в этой строке
    if (!changedFields[id] || changedFields[id].size === 0) {
      return;
    }

    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    const updateData: Partial<Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'>> = {
      service: payment.service || '',
      cost: typeof payment.cost === 'number' ? payment.cost : parseNumber(String(payment.cost || 0)),
      cost_currency: payment.cost_currency || payment.currency || 'евро',
      percent: typeof payment.percent === 'number' ? payment.percent : parseNumber(String(payment.percent || 0)),
      percent_currency: payment.percent_currency || 'евро',
      advance: typeof payment.advance === 'number' ? payment.advance : parseNumber(String(payment.advance || 0)),
      advance_currency: payment.advance_currency || 'евро',
      date: payment.date || new Date().toISOString().split('T')[0],
      currency: payment.cost_currency || payment.currency || 'евро', // Старое поле для обратной совместимости
      comment: payment.comment || null,
    };

    try {
      const updated = await contractorPaymentService.updatePayment(id, updateData);
      if (updated) {
        // Убедимся, что to_pay правильно вычислен (cost - advance - percent)
        // Это гарантирует правильное значение даже если триггер на сервере не сработал
        const recalculatedToPay = (updated.cost || 0) - (updated.advance || 0) - (updated.percent || 0);
        const finalUpdated = { ...updated, to_pay: recalculatedToPay };
        
        console.log('Updated payment:', {
          id,
          cost: updated.cost,
          advance: updated.advance,
          percent: updated.percent,
          to_pay_from_server: updated.to_pay,
          to_pay_calculated: recalculatedToPay
        });
        
        setPayments(prev => prev.map(p => p.id === id ? finalUpdated : p));
        
        // Очищаем отслеживание изменений после успешного сохранения
        setChangedFields(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        setShowToast(true);
        
        // Перезагружаем все данные с сервера чтобы гарантировать правильный to_pay из триггера
        if (selectedEventId) {
          setTimeout(() => {
            loadPaymentsByEvent(selectedEventId);
          }, 100);
        }
      } else {
        console.error('Ошибка сохранения');
        if (selectedEventId) {
          loadPaymentsByEvent(selectedEventId);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      if (selectedEventId) {
        loadPaymentsByEvent(selectedEventId);
      }
    }
  }, [payments, selectedEventId, loadPaymentsByEvent, parseNumber, changedFields]);

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Вы точно хотите удалить эту оплату подрядчику?')) {
      return;
    }
    const success = await contractorPaymentService.deletePayment(id);
    if (success) {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDownloadPDF = async () => {
    if (payments.length === 0) return;

    // Подготовка данных таблицы
    const tableBody = payments.map(payment => [
      payment.service || '',
      payment.cost.toString() || '0',
      payment.percent.toString() || '0',
      payment.advance.toString() || '0',
      payment.date || '',
      payment.to_pay?.toString() || '0',
      payment.comment || '',
    ]);

    const totalCost = payments.reduce((sum, p) => sum + (p.cost || 0), 0);
    const totalAdvance = payments.reduce((sum, p) => sum + (p.advance || 0), 0);
    const totalToPay = payments.reduce((sum, p) => sum + (p.to_pay || 0), 0);

    // Вычисляем суммы к оплате по валютам
    const toPayTotals = await getTotalInAllCurrencies(
      payments.map(p => ({ 
        amount: p.to_pay || 0, 
        currency: (p.cost_currency || p.currency || 'евро') as Currency 
      }))
    );

    tableBody.push([
      'ИТОГО',
      totalCost.toFixed(2),
      '',
      totalAdvance.toFixed(2),
      '',
      totalToPay.toFixed(2),
      '',
    ]);

    // Вычисляем максимальную ширину контента для каждого столбца (кроме комментария)
    const calculateColumnWidth = (columnIndex: number, minWidth: number = 40): number => {
      const headerWidths = [40, 50, 10, 35, 30, 50]; // Минимальная ширина заголовков
      let maxWidth = Math.max(headerWidths[columnIndex] || minWidth, minWidth);
      
      // Находим максимальную длину контента в столбце
      tableBody.forEach(row => {
        const cellText = String(row[columnIndex] || '');
        // Примерно 5.5 пикселей на символ для font size 10 + отступы
        const textWidth = cellText.length * 5.5 + 10;
        if (textWidth > maxWidth) {
          maxWidth = textWidth;
        }
      });
      
      return Math.max(maxWidth, minWidth);
    };

    const columnWidths = [
      calculateColumnWidth(0, 60),  // Услуга
      calculateColumnWidth(1, 50),  // Стоимость
      calculateColumnWidth(2, 35),  // %
      calculateColumnWidth(3, 50),  // Аванс
      calculateColumnWidth(4, 75),  // Дата
      calculateColumnWidth(5, 60),  // К Оплате
      '*', // Комментарий занимает все оставшееся место
    ];

    // Создание документа pdfmake
    const docDefinition = {
      pageMargins: [20, 40, 40, 40], // [left, top, right, bottom] - меньший отступ слева
      content: [
        {
          text: 'Оплаты подрядчикам',
          style: 'header',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: columnWidths,
            body: [
              [
                { text: 'Услуга', style: 'tableHeader', noWrap: true },
                { text: 'Стоимость', style: 'tableHeader' },
                { text: '%', style: 'tableHeader' },
                { text: 'Аванс', style: 'tableHeader' },
                { text: 'Дата', style: 'tableHeader' },
                { text: 'К Оплате', style: 'tableHeader' },
                { text: 'Комментарий', style: 'tableHeader' },
              ],
              ...tableBody.map((row, index) => {
                const isTotal = index === tableBody.length - 1;
                return [
                  { text: row[0], noWrap: true }, // Услуга без переноса
                  { text: row[1], alignment: 'right', bold: isTotal },
                  { text: row[2], alignment: 'right', bold: isTotal },
                  { text: row[3], alignment: 'right', bold: isTotal },
                  row[4],
                  { text: row[5], alignment: 'right', bold: isTotal },
                  { text: row[6] || '', margin: [2, 2, 2, 2] }, // Комментарий с отступами и автоматическим переносом
                ];
              }),
            ],
          },
          layout: 'lightGridLines',
        },
        {
          text: 'Итого к оплате:',
          style: 'totalHeader',
          margin: [0, 10, 0, 5],
        },
        {
          text: `Общая сумма: ${totalToPay.toFixed(2)}`,
          style: 'totalText',
          margin: [0, 0, 0, 3],
        },
        {
          text: `USD: ${formatCurrencyAmount(toPayTotals.доллар)}`,
          style: 'totalText',
          margin: [0, 0, 0, 3],
        },
        {
          text: `EUR: ${formatCurrencyAmount(toPayTotals.евро)}`,
          style: 'totalText',
          margin: [0, 0, 0, 3],
        },
        {
          text: `ГРН: ${formatCurrencyAmount(toPayTotals.грн)}`,
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

    pdfMake.createPdf(docDefinition).download('оплаты_подрядчикам.pdf');
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
          <h2 className="text-2xl font-forum font-bold">Оплаты подрядчикам</h2>
          {payments.length > 0 && selectedEventId && (
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

        {/* Таблица оплат */}
        {selectedEventId ? (
          <div className="overflow-auto rounded-lg mb-3 p-1.5">
        <table className="border-collapse w-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] sticky left-0 bg-gray-100 z-10 whitespace-nowrap">
                Услуга
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                Стоимость
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                %
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                Аванс
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                Дата
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                К Оплате
              </th>
              <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]" style={{ minWidth: '150px' }}>
                Комментарий
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
            {payments.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-[#00000033] px-3 py-8 text-center text-[#00000080] font-forum">
                  Нет данных. Нажмите "+ Добавить строку" чтобы начать.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr 
                  key={payment.id} 
                  className="hover:bg-gray-50"
                  onBlur={() => {
                    // Сохраняем строку при потере фокуса любым элементом внутри
                    handleSaveRow(payment.id);
                  }}
                  onMouseLeave={() => {
                    // Дополнительная защита: сохраняем при наведении мыши
                    if (editingRowId === payment.id) {
                      handleSaveRow(payment.id);
                      setEditingRowId(null);
                    }
                  }}
                  onMouseEnter={() => setEditingRowId(payment.id)}
                >
                  <td className="border border-[#00000033] p-0 sticky left-0 bg-white z-10">
                    <input
                      type="text"
                      value={payment.service || ''}
                      onChange={(e) => handleUpdatePayment(payment.id, 'service', e.target.value)}
                      onBlur={() => {
                        handleSaveRow(payment.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                      placeholder="Услуга"
                    />
                  </td>
                  <td className="border border-[#00000033] p-0">
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        value={formatNumber(payment.cost)}
                        onChange={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleUpdatePayment(payment.id, 'cost', numValue);
                        }}
                        onBlur={() => {
                          handleSaveRow(payment.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.cost_currency || payment.currency || 'евро'}
                        onChange={(e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'cost_currency', newCurrency);
                        }}
                        onBlur={() => handleSaveRow(payment.id)}
                        className="px-0.5 py-0.5 -ml-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[16px] max-[1599px]:text-[15px] bg-transparent cursor-pointer min-w-[35px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="грн">₴</option>
                        <option value="доллар">$</option>
                        <option value="евро">€</option>
                      </select>
                    </div>
                  </td>
                  <td className="border border-[#00000033] p-0">
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        value={formatNumber(payment.percent)}
                        onChange={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleUpdatePayment(payment.id, 'percent', numValue);
                        }}
                        onBlur={() => {
                          handleSaveRow(payment.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.percent_currency || 'евро'}
                        onChange={(e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'percent_currency', newCurrency);
                        }}
                        onBlur={() => handleSaveRow(payment.id)}
                        className="px-0.5 py-0.5 -ml-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[16px] max-[1599px]:text-[15px] bg-transparent cursor-pointer min-w-[35px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="грн">₴</option>
                        <option value="доллар">$</option>
                        <option value="евро">€</option>
                      </select>
                    </div>
                  </td>
                  <td className="border border-[#00000033] p-0">
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        value={formatNumber(payment.advance)}
                        onChange={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleUpdatePayment(payment.id, 'advance', numValue);
                        }}
                        onBlur={() => {
                          handleSaveRow(payment.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.advance_currency || 'евро'}
                        onChange={(e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'advance_currency', newCurrency);
                        }}
                        onBlur={() => handleSaveRow(payment.id)}
                        className="px-0.5 py-0.5 -ml-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[16px] max-[1599px]:text-[15px] bg-transparent cursor-pointer min-w-[35px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="грн">₴</option>
                        <option value="доллар">$</option>
                        <option value="евро">€</option>
                      </select>
                    </div>
                  </td>
                  <td className="border border-[#00000033] p-0">
                    <input
                      type="date"
                      value={payment.date}
                      onChange={(e) => handleUpdatePayment(payment.id, 'date', e.target.value)}
                      onBlur={() => {
                        handleSaveRow(payment.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                    />
                  </td>
                  <td className="border border-[#00000033] px-1 py-0.5 font-forum text-[14px] max-[1599px]:text-[13px] text-right bg-gray-50 font-semibold">
                    <div className="flex items-center justify-end gap-1">
                      <span>{payment.to_pay?.toFixed(2) || '0.00'}</span>
                      <span className="text-[16px] max-[1599px]:text-[15px]">
                        {(payment.cost_currency || payment.currency) === 'доллар' ? '$' : (payment.cost_currency || payment.currency) === 'евро' ? '€' : '₴'}
                      </span>
                    </div>
                  </td>
                  <td className="border border-[#00000033] p-0" style={{ minWidth: '150px', width: 'auto' }}>
                    <input
                      type="text"
                      value={payment.comment || ''}
                      onChange={(e) => {
                        handleUpdatePayment(payment.id, 'comment', e.target.value);
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
                      onBlur={() => {
                        handleSaveRow(payment.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                      placeholder="Комментарий"
                      style={{
                        minWidth: '150px',
                        width: 'auto'
                      }}
                      ref={(input) => {
                        if (input && payment.comment) {
                          const measure = document.createElement('span');
                          measure.style.visibility = 'hidden';
                          measure.style.position = 'absolute';
                          measure.style.whiteSpace = 'pre';
                          measure.style.font = window.getComputedStyle(input).font;
                          measure.textContent = payment.comment;
                          document.body.appendChild(measure);
                          const textWidth = measure.offsetWidth;
                          document.body.removeChild(measure);
                          input.style.width = 'auto';
                          input.style.width = `${Math.max(150, Math.min(textWidth + 20, window.innerWidth * 0.5))}px`;
                        }
                      }}
                    />
                  </td>
                  <td className="border border-[#00000033] p-1.5 text-center">
                    <button
                      onClick={() => handleSaveRow(payment.id)}
                      className="text-black hover:text-[#1a1a1a] active:scale-95 cursor-pointer transition-all duration-200 text-[13px] max-[1599px]:text-[12px] font-forum"
                      title="Сохранить"
                    >
                      Сохранить
                    </button>
                  </td>
                  <td className="border border-[#00000033] p-1.5 text-center">
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
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
            <p className="text-[#00000080] font-forum">Создайте ивент, чтобы начать работу с оплатами подрядчикам</p>
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
              {payments.length > 0 && (
                <div className="flex gap-8">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span className="font-semibold">Итого к оплате:</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>USD: {formatCurrencyAmount(totals.доллар)}</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>EUR: {formatCurrencyAmount(totals.евро)}</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>ГРН: {formatCurrencyAmount(totals.грн)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span className="font-semibold">Нужно взять на ивент:</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>USD: {totalsByCurrency.доллар.toFixed(2)}</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>EUR: {totalsByCurrency.евро.toFixed(2)}</span>
                    </div>
                    <div className="text-[14px] max-[1599px]:text-[13px] font-forum">
                      <span>ГРН: {totalsByCurrency.грн.toFixed(2)}</span>
                    </div>
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

export default ContractorsPaymentsTab;

