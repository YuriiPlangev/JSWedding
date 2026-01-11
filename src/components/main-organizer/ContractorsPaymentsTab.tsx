import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { contractorPaymentService } from '../../services/weddingService';
import type { ContractorPayment } from '../../types';
import type { Currency } from '../../utils/currencyConverter';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Toast from '../Toast';

// Инициализация шрифтов для pdfmake
(pdfMake as any).vfs = pdfFonts;

const ContractorsPaymentsTab = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ContractorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await contractorPaymentService.getPayments(user.id);
    setPayments(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadPayments();
    }
  }, [user?.id, loadPayments]);

  const addRow = async () => {
    if (!user?.id) return;
    
    const newPayment: Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'> = {
      created_by: user.id,
      service: '',
      cost: 0,
      cost_currency: 'грн',
      percent: 0,
      percent_currency: 'грн',
      advance: 0,
      advance_currency: 'грн',
      date: new Date().toISOString().split('T')[0],
      currency: 'грн', // Старое поле для обратной совместимости
      comment: null,
    };

    await handleCreatePayment(newPayment);
  };

  const handleCreatePayment = async (payment: Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'>) => {
    const created = await contractorPaymentService.createPayment(payment);
    if (created) {
      setPayments(prev => [created, ...prev]);
    }
  };

  // Обновление UI сразу, без сохранения
  const handleUpdatePayment = useCallback((id: string, field: keyof ContractorPayment, value: string | number | Currency | null) => {
    // Оптимистичное обновление UI сразу
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        // Пересчитываем to_pay если изменились cost или advance
        if (field === 'cost' || field === 'advance') {
          updated.to_pay = (updated.cost || 0) - (updated.advance || 0);
        }
        return updated;
      }
      return p;
    }));
  }, []);

  // Функция для парсинга числа из строки
  const parseNumber = useCallback((value: string): number => {
    // Убираем все пробелы и запятые, заменяем запятую на точку
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Форматирование числа для отображения
  const formatNumber = useCallback((value: number): string => {
    // Показываем пустую строку только если значение null или undefined
    if (value === null || value === undefined || isNaN(value)) return '';
    // Показываем число, включая 0
    return value.toString();
  }, []);

  // Сохранение в Supabase при потере фокуса
  const handleSavePayment = useCallback(async (id: string, field: keyof ContractorPayment, value: string | number | Currency) => {
    // Находим текущее значение в состоянии
    const currentPayment = payments.find(p => p.id === id);
    if (!currentPayment) return;

    // Для валют всегда сохраняем значение
    if (field === 'currency' || field === 'cost_currency' || field === 'percent_currency' || field === 'advance_currency') {
      const updated = await contractorPaymentService.updatePayment(id, { [field]: value as Currency });
      if (updated) {
        setPayments(prev => prev.map(p => p.id === id ? updated : p));
        setShowToast(true);
      } else {
        loadPayments();
      }
      return;
    }

    // Преобразуем значение в нужный тип
    let finalValue: string | number = value;
    if (field === 'cost' || field === 'percent' || field === 'advance') {
      finalValue = typeof value === 'string' ? parseNumber(value) : value;
    }

    // Проверяем, изменилось ли значение (для чисел сравниваем с точностью)
    const currentValue = currentPayment[field];
    if (typeof currentValue === 'number' && typeof finalValue === 'number') {
      if (Math.abs(currentValue - finalValue) < 0.01) {
        return;
      }
    } else if (currentValue === finalValue) {
      return;
    }

    const updated = await contractorPaymentService.updatePayment(id, { [field]: finalValue });
    if (updated) {
      setPayments(prev => prev.map(p => p.id === id ? updated : p));
      setShowToast(true);
    } else {
      loadPayments();
    }
  }, [loadPayments, payments, parseNumber]);

  // Сохранение всей строки сразу
  const handleSaveRow = useCallback(async (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    const updateData: Partial<Omit<ContractorPayment, 'id' | 'created_at' | 'updated_at' | 'to_pay'>> = {
      service: payment.service || '',
      cost: typeof payment.cost === 'number' ? payment.cost : parseNumber(String(payment.cost || 0)),
      cost_currency: payment.cost_currency || payment.currency || 'грн',
      percent: typeof payment.percent === 'number' ? payment.percent : parseNumber(String(payment.percent || 0)),
      percent_currency: payment.percent_currency || 'грн',
      advance: typeof payment.advance === 'number' ? payment.advance : parseNumber(String(payment.advance || 0)),
      advance_currency: payment.advance_currency || 'грн',
      date: payment.date || new Date().toISOString().split('T')[0],
      currency: payment.cost_currency || payment.currency || 'грн', // Старое поле для обратной совместимости
      comment: payment.comment || null,
    };

    try {
      const updated = await contractorPaymentService.updatePayment(id, updateData);
      if (updated) {
        setPayments(prev => prev.map(p => p.id === id ? updated : p));
        setShowToast(true);
      } else {
        console.error('Ошибка сохранения');
        loadPayments();
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      loadPayments();
    }
  }, [payments, loadPayments, parseNumber]);

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Вы точно хотите удалить эту оплату подрядчику?')) {
      return;
    }
    const success = await contractorPaymentService.deletePayment(id);
    if (success) {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleDownloadPDF = () => {
    if (payments.length === 0) return;

    // Подготовка данных таблицы
    const tableBody = payments.map(payment => [
      payment.service || '',
      payment.cost.toString() || '0',
      payment.percent.toString() || '0',
      payment.advance.toString() || '0',
      payment.date || '',
      payment.to_pay?.toString() || '0',
    ]);

    const totalCost = payments.reduce((sum, p) => sum + (p.cost || 0), 0);
    const totalAdvance = payments.reduce((sum, p) => sum + (p.advance || 0), 0);
    const totalToPay = payments.reduce((sum, p) => sum + (p.to_pay || 0), 0);

    tableBody.push([
      'ИТОГО',
      totalCost.toFixed(2),
      '',
      totalAdvance.toFixed(2),
      '',
      totalToPay.toFixed(2),
    ]);

    // Создание документа pdfmake
    const docDefinition = {
      content: [
        {
          text: 'Оплаты подрядчикам',
          style: 'header',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Услуга', style: 'tableHeader' },
                { text: 'Стоимость', style: 'tableHeader' },
                { text: '%', style: 'tableHeader' },
                { text: 'Аванс', style: 'tableHeader' },
                { text: 'Дата', style: 'tableHeader' },
                { text: 'К Оплате', style: 'tableHeader' },
              ],
              ...tableBody.map((row, index) => {
                const isTotal = index === tableBody.length - 1;
                return [
                  row[0],
                  { text: row[1], alignment: 'right', bold: isTotal },
                  { text: row[2], alignment: 'right', bold: isTotal },
                  { text: row[3], alignment: 'right', bold: isTotal },
                  row[4],
                  { text: row[5], alignment: 'right', bold: isTotal },
                ];
              }),
            ],
          },
          layout: 'lightGridLines',
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
        {payments.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
          >
            Скачать PDF
          </button>
        )}
      </div>

      {/* Таблица оплат */}
      <div className="overflow-auto border border-[#00000033] rounded-lg mb-3">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] sticky left-0 bg-gray-100 z-10">
                Услуга
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                Стоимость
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                %
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                Аванс
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                Дата
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                К Оплате
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px]">
                Комментарий
              </th>
              <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] w-12">
                  💾
                </th>
                <th className="border border-[#00000033] px-2 py-1.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] w-12">
                  ✕
                </th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-[#00000033] px-3 py-8 text-center text-[#00000080] font-forum">
                  Нет данных. Нажмите "+ Добавить строку" чтобы начать.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="border border-[#00000033] p-0 sticky left-0 bg-white z-10">
                    <input
                      type="text"
                      value={payment.service || ''}
                      onChange={(e) => handleUpdatePayment(payment.id, 'service', e.target.value)}
                      onBlur={(e) => handleSavePayment(payment.id, 'service', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                          handleSaveRow(payment.id);
                        }
                      }}
                      className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
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
                        onBlur={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleSavePayment(payment.id, 'cost', numValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                            handleSaveRow(payment.id);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.cost_currency || payment.currency || 'грн'}
                        onChange={async (e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'cost_currency', newCurrency);
                          const updated = await contractorPaymentService.updatePayment(payment.id, { cost_currency: newCurrency });
                          if (updated) {
                            setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
                            setShowToast(true);
                          }
                        }}
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
                        onBlur={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleSavePayment(payment.id, 'percent', numValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                            handleSaveRow(payment.id);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.percent_currency || 'грн'}
                        onChange={async (e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'percent_currency', newCurrency);
                          const updated = await contractorPaymentService.updatePayment(payment.id, { percent_currency: newCurrency });
                          if (updated) {
                            setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
                            setShowToast(true);
                          }
                        }}
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
                        onBlur={(e) => {
                          const numValue = parseNumber(e.target.value);
                          handleSavePayment(payment.id, 'advance', numValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                            handleSaveRow(payment.id);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <select
                        value={payment.advance_currency || 'грн'}
                        onChange={async (e) => {
                          const newCurrency = e.target.value as Currency;
                          handleUpdatePayment(payment.id, 'advance_currency', newCurrency);
                          const updated = await contractorPaymentService.updatePayment(payment.id, { advance_currency: newCurrency });
                          if (updated) {
                            setPayments(prev => prev.map(p => p.id === payment.id ? updated : p));
                            setShowToast(true);
                          }
                        }}
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
                      onBlur={(e) => handleSavePayment(payment.id, 'date', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                          handleSaveRow(payment.id);
                        }
                      }}
                      className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                    />
                  </td>
                  <td className="border border-[#00000033] px-2 py-1.5 font-forum text-[14px] max-[1599px]:text-[13px] text-right bg-gray-50 font-semibold">
                    <div className="flex items-center justify-end gap-1">
                      <span>{payment.to_pay?.toFixed(2) || '0.00'}</span>
                      <span className="text-[16px] max-[1599px]:text-[15px]">
                        {(payment.cost_currency || payment.currency) === 'доллар' ? '$' : (payment.cost_currency || payment.currency) === 'евро' ? '€' : '₴'}
                      </span>
                    </div>
                  </td>
                  <td className="border border-[#00000033] p-0">
                    <input
                      type="text"
                      value={payment.comment || ''}
                      onChange={(e) => handleUpdatePayment(payment.id, 'comment', e.target.value)}
                      onBlur={(e) => handleSavePayment(payment.id, 'comment', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                          handleSaveRow(payment.id);
                        }
                      }}
                      className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                      placeholder="Комментарий"
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

      <button
        onClick={addRow}
        className="px-3 py-1.5 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
      >
        + Добавить строку
      </button>
      </div>
    </>
  );
};

export default ContractorsPaymentsTab;

