import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useAuth } from '../../context/AuthContext';
import { salaryService, coordinationService } from '../../services/weddingService';
import type { Employee, Salary, CoordinationPayment } from '../../types';
import { getExchangeRates, formatCurrencyAmount } from '../../utils/currencyConverter';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Toast from '../Toast';

// Инициализация шрифтов для pdfmake
(pdfMake as any).vfs = pdfFonts;

const SalariesTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [coordinationPayments, setCoordinationPayments] = useState<Record<string, CoordinationPayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showNewEmployeeInput, setShowNewEmployeeInput] = useState(false);
  const newEmployeeInputRef = useRef<HTMLInputElement>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [changedFields, setChangedFields] = useState<Record<string, Set<string>>>({});

  const loadEmployees = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await salaryService.getEmployees(user.id);
    setEmployees(data);
    if (data.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(data[0].id);
    }
    setLoading(false);
  };

  const loadSalaries = useCallback(async (employeeId: string) => {
    const data = await salaryService.getSalariesByEmployee(employeeId);
    setSalaries(data);
    
    // Загружаем координации для каждой зарплаты
    const coordinations: Record<string, CoordinationPayment[]> = {};
    for (const salary of data) {
      const coordData = await coordinationService.getCoordinationPayments(salary.id);
      // Если нет координаций, создаем одну по умолчанию
      if (coordData.length === 0) {
        const newCoordination: Omit<CoordinationPayment, 'id' | 'created_at' | 'updated_at'> = {
          salary_id: salary.id,
          name: 'Ивент',
          amount: 0,
          currency: 'грн',
        };
        const created = await coordinationService.createCoordinationPayment(newCoordination);
        coordinations[salary.id] = created ? [created] : [];
      } else {
        coordinations[salary.id] = coordData;
      }
    }
    setCoordinationPayments(coordinations);
  }, []);

  // Загружаем сотрудников
  useEffect(() => {
    if (user?.id) {
      loadEmployees();
    }
  }, [user?.id]);

  // Загружаем зарплаты при выборе сотрудника
  useEffect(() => {
    if (selectedEmployeeId) {
      loadSalaries(selectedEmployeeId);
    } else {
      setSalaries([]);
    }
  }, [selectedEmployeeId, loadSalaries]);

  const handleCreateEmployee = async () => {
    if (!user?.id || !newEmployeeName.trim()) return;
    
    const employee = await salaryService.createEmployee(user.id, newEmployeeName.trim());
    if (employee) {
      setEmployees(prev => [...prev, employee]);
      setSelectedEmployeeId(employee.id);
      setNewEmployeeName('');
      setShowNewEmployeeInput(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника? Все данные о зарплатах будут удалены.')) {
      return;
    }

    const success = await salaryService.deleteEmployee(employeeId);
    if (success) {
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      if (selectedEmployeeId === employeeId) {
        setSelectedEmployeeId(employees.find(e => e.id !== employeeId)?.id || null);
      }
    }
  };

  const handleRenameEmployee = async (employeeId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = await salaryService.updateEmployee(employeeId, newName.trim());
    if (updated) {
      setEmployees(prev => prev.map(e => e.id === employeeId ? updated : e));
    }
  };

  const addRow = async () => {
    if (!selectedEmployeeId) return;
    
    // Находим следующий свободный месяц
    const now = new Date();
    let year = now.getFullYear();
    let monthNum = now.getMonth() + 1; // 1-12
    
    // Проверяем существующие месяцы
    const existingMonths = new Set(salaries.map(s => s.month));
    
    // Ищем первый свободный месяц (начиная с текущего, затем следующие)
    let attempts = 0;
    let month = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    
    while (existingMonths.has(month) && attempts < 24) { // Проверяем до 2 лет вперед
      monthNum++;
      if (monthNum > 12) {
        monthNum = 1;
        year++;
      }
      month = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      attempts++;
    }
    
    if (attempts >= 24) {
      alert('Не удалось найти свободный месяц. Пожалуйста, удалите старые записи.');
      return;
    }

    const newSalary: Omit<Salary, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: selectedEmployeeId,
      month,
      salary: 0,
      bonus: 0,
    };

    await handleCreateSalary(newSalary);
  };

  const handleCreateSalary = async (salary: Omit<Salary, 'id' | 'created_at' | 'updated_at'>) => {
    // Проверяем, не существует ли уже запись для этого месяца
    const existing = salaries.find(s => s.employee_id === salary.employee_id && s.month === salary.month);
    if (existing) {
      alert(`Запись за этот месяц уже существует. Выберите другой месяц.`);
      return;
    }
    
    const created = await salaryService.createSalary(salary);
    if (created) {
      setSalaries(prev => [created, ...prev].sort((a, b) => b.month.localeCompare(a.month)));
      // Автоматически создаем одну координацию для новой зарплаты
      const newCoordination: Omit<CoordinationPayment, 'id' | 'created_at' | 'updated_at'> = {
        salary_id: created.id,
        name: 'Ивент',
        amount: 0,
        currency: 'грн',
      };
      const coordCreated = await coordinationService.createCoordinationPayment(newCoordination);
      if (coordCreated) {
        setCoordinationPayments(prev => ({
          ...prev,
          [created.id]: [coordCreated],
        }));
      }
    } else {
      alert('Ошибка при создании записи. Возможно, запись за этот месяц уже существует.');
    }
  };

  // Функция для парсинга числа из строки
  const parseNumber = useCallback((value: string): number => {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // Форматирование числа для отображения (пустая строка для 0)
  const formatNumber = useCallback((value: number): string => {
    if (value === null || value === undefined || isNaN(value) || value === 0) return '';
    return value.toString();
  }, []);

  // Обновление UI сразу, без сохранения
  const handleUpdateSalary = useCallback((id: string, field: keyof Salary, value: string | number | undefined) => {
    // Находим текущее значение для сравнения
    const salary = salaries.find(s => s.id === id);
    if (!salary) return;

    const currentValue = salary[field];
    
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

    setSalaries(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  }, [salaries]);

  // Сохранение в Supabase при потере фокуса
  const handleSaveSalary = useCallback(async (id: string, field: keyof Salary, value: string | number) => {
    const currentSalary = salaries.find(s => s.id === id);
    if (!currentSalary) return;

    // Преобразуем значение в нужный тип
    let finalValue: string | number = value;
    if (field === 'salary' || field === 'bonus') {
      finalValue = typeof value === 'string' ? parseNumber(value) : value;
    }

    // Проверяем, изменилось ли значение (для чисел сравниваем с точностью)
    const currentValue = currentSalary[field];
    if (typeof currentValue === 'number' && typeof finalValue === 'number') {
      if (Math.abs(currentValue - finalValue) < 0.01) {
        return;
      }
    } else if (currentValue === finalValue) {
      return;
    }

    try {
      const updated = await salaryService.updateSalary(id, { [field]: finalValue });
      if (updated) {
        setSalaries(prev => {
          const newSalaries = prev.map(s => {
            if (s.id === id) {
              if (s[field] !== updated[field]) {
                return updated;
              }
              return s;
            }
            return s;
          });
          return newSalaries;
        });
        setShowToast(true);
      } else {
        console.error('Ошибка сохранения поля');
        if (selectedEmployeeId) {
          loadSalaries(selectedEmployeeId);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении поля:', error);
      if (selectedEmployeeId) {
        loadSalaries(selectedEmployeeId);
      }
    }
  }, [salaries, selectedEmployeeId, parseNumber, loadSalaries]);

  // Сохранение всей строки сразу
  const handleSaveRow = useCallback(async (id: string) => {
    // Проверяем, были ли изменения в этой строке
    if (!changedFields[id] || changedFields[id].size === 0) {
      return;
    }

    const salary = salaries.find(s => s.id === id);
    if (!salary) return;

    const updateData: Partial<Omit<Salary, 'id' | 'created_at' | 'updated_at'>> = {
      month: salary.month,
      salary: typeof salary.salary === 'number' ? salary.salary : parseNumber(String(salary.salary || 0)),
      salary_currency: salary.salary_currency || 'грн',
      bonus: typeof salary.bonus === 'number' ? salary.bonus : parseNumber(String(salary.bonus || 0)),
      bonus_currency: salary.bonus_currency || undefined,
    };

    try {
      const updated = await salaryService.updateSalary(id, updateData);
      if (updated) {
        setSalaries(prev => prev.map(s => s.id === id ? updated : s));
        
        // Очищаем отслеживание изменений после успешного сохранения
        setChangedFields(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        
        setShowToast(true);
      } else {
        console.error('Ошибка сохранения');
        if (selectedEmployeeId) {
          loadSalaries(selectedEmployeeId);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      if (selectedEmployeeId) {
        loadSalaries(selectedEmployeeId);
      }
    }
  }, [salaries, selectedEmployeeId, parseNumber, loadSalaries, changedFields]);

  const handleDeleteSalary = async (id: string) => {
    if (!confirm('Вы точно хотите удалить эту зарплату?')) {
      return;
    }
    const success = await salaryService.deleteSalary(id);
    if (success) {
      setSalaries(prev => prev.filter(s => s.id !== id));
    }
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr);
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Синхронная версия для отображения (использует кэшированные курсы)
  const [exchangeRates, setExchangeRates] = useState<{ usd: number; eur: number } | null>(null);

  useEffect(() => {
    getExchangeRates().then(rates => setExchangeRates(rates));
  }, []);

  const getTotalSync = (salary: Salary): number => {
    if (!exchangeRates) {
      const baseTotal = (salary.salary || 0) + (salary.bonus || 0);
      const coordTotal = (coordinationPayments[salary.id] || []).reduce((sum, c) => sum + (c.amount || 0), 0);
      return baseTotal + coordTotal;
    }
    
    let total = 0;
    
    // Конвертируем зарплату в гривны
    if (salary.salary && salary.salary > 0) {
      if (salary.salary_currency === 'доллар') {
        total += salary.salary * exchangeRates.usd;
      } else if (salary.salary_currency === 'евро') {
        total += salary.salary * exchangeRates.eur;
      } else {
        total += salary.salary; // грн по умолчанию
      }
    }
    
    // Конвертируем бонус в гривны
    if (salary.bonus && salary.bonus > 0) {
      if (salary.bonus_currency === 'доллар') {
        total += salary.bonus * exchangeRates.usd;
      } else if (salary.bonus_currency === 'евро') {
        total += salary.bonus * exchangeRates.eur;
      } else {
        total += salary.bonus;
      }
    }
    
    // Конвертируем все координации в гривны
    const coordinations = coordinationPayments[salary.id] || [];
    coordinations.forEach(coord => {
      if (coord.amount && coord.amount > 0) {
        if (coord.currency === 'доллар') {
          total += coord.amount * exchangeRates.usd;
        } else if (coord.currency === 'евро') {
          total += coord.amount * exchangeRates.eur;
        } else {
          total += coord.amount; // грн по умолчанию
        }
      }
    });
    
    return total;
  };

  // Добавить координацию
  const handleAddCoordination = async (salaryId: string) => {
    const newCoordination: Omit<CoordinationPayment, 'id' | 'created_at' | 'updated_at'> = {
      salary_id: salaryId,
      name: 'Ивент',
      amount: 0,
      currency: 'грн',
    };

    const created = await coordinationService.createCoordinationPayment(newCoordination);
    if (created) {
      setCoordinationPayments(prev => ({
        ...prev,
        [salaryId]: [...(prev[salaryId] || []), created],
      }));
    }
  };

  // Удалить координацию
  const handleDeleteCoordination = async (coordinationId: string, salaryId: string) => {
    if (!confirm('Вы точно хотите удалить эту координацию?')) {
      return;
    }
    const success = await coordinationService.deleteCoordinationPayment(coordinationId);
    if (success) {
      setCoordinationPayments(prev => ({
        ...prev,
        [salaryId]: (prev[salaryId] || []).filter(c => c.id !== coordinationId),
      }));
    }
  };

  // Обновить координацию
  const handleUpdateCoordination = useCallback((id: string, field: keyof CoordinationPayment, value: string | number) => {
    setCoordinationPayments(prev => {
      const newCoords: Record<string, CoordinationPayment[]> = {};
      Object.keys(prev).forEach(salaryId => {
        newCoords[salaryId] = prev[salaryId].map(c => {
          if (c.id === id) {
            return { ...c, [field]: value };
          }
          return c;
        });
      });
      return newCoords;
    });
  }, []);

  // Сохранить координацию
  const handleSaveCoordination = useCallback(async (id: string, field: keyof CoordinationPayment, value: string | number) => {
    let finalValue: string | number = value;
    if (field === 'amount') {
      finalValue = typeof value === 'string' ? parseNumber(value) : value;
    }

    const updated = await coordinationService.updateCoordinationPayment(id, { [field]: finalValue });
    if (updated) {
      setCoordinationPayments(prev => {
        const newCoords: Record<string, CoordinationPayment[]> = {};
        Object.keys(prev).forEach(salaryId => {
          newCoords[salaryId] = prev[salaryId].map(c => c.id === id ? updated : c);
        });
        return newCoords;
      });
      setShowToast(true);
    }
  }, [parseNumber]);

  const handleDownloadPDF = () => {
    if (!selectedEmployeeId || salaries.length === 0) return;

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    
    // Подготовка данных таблицы
    const tableBody = salaries.map(salary => {
      const coordinations = coordinationPayments[salary.id] || [];
      const coordTotal = coordinations.reduce((sum, c) => {
        if (!exchangeRates) return sum + (c.amount || 0);
        if (c.currency === 'доллар') return sum + (c.amount || 0) * exchangeRates.usd;
        if (c.currency === 'евро') return sum + (c.amount || 0) * exchangeRates.eur;
        return sum + (c.amount || 0);
      }, 0);
      
      return [
        formatMonth(salary.month),
        salary.salary.toString() || '0',
        salary.bonus.toString() || '0',
        coordTotal.toFixed(2),
        getTotalSync(salary).toFixed(2),
      ];
    });

    const totalSalary = salaries.reduce((sum, s) => sum + (s.salary || 0), 0);
    const totalBonus = salaries.reduce((sum, s) => sum + (s.bonus || 0), 0);
    const totalCoordination = salaries.reduce((sum, s) => {
      const coordinations = coordinationPayments[s.id] || [];
      return sum + coordinations.reduce((coordSum, c) => {
        if (!exchangeRates) return coordSum + (c.amount || 0);
        if (c.currency === 'доллар') return coordSum + (c.amount || 0) * exchangeRates.usd;
        if (c.currency === 'евро') return coordSum + (c.amount || 0) * exchangeRates.eur;
        return coordSum + (c.amount || 0);
      }, 0);
    }, 0);
    const grandTotal = totalSalary + totalBonus + totalCoordination;

    tableBody.push([
      'ИТОГО',
      totalSalary.toFixed(2),
      totalBonus.toFixed(2),
      totalCoordination.toFixed(2),
      grandTotal.toFixed(2),
    ]);

    // Создание документа pdfmake
    const docDefinition = {
      content: [
        {
          text: selectedEmployee ? selectedEmployee.name : 'Зарплаты',
          style: 'header',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Месяц', style: 'tableHeader' },
                { text: 'Зарплата', style: 'tableHeader' },
                { text: 'Бонус', style: 'tableHeader' },
                { text: 'Координация', style: 'tableHeader' },
                { text: 'Общая', style: 'tableHeader' },
              ],
              ...tableBody.map((row, index) => {
                const isTotal = index === tableBody.length - 1;
                return [
                  row[0],
                  { text: row[1], alignment: 'right', bold: isTotal },
                  { text: row[2], alignment: 'right', bold: isTotal },
                  { text: row[3], alignment: 'right', bold: isTotal },
                  { text: row[4], alignment: 'right', bold: isTotal },
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

    const fileName = selectedEmployee ? `${selectedEmployee.name}_зарплаты.pdf` : 'зарплаты.pdf';
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
        <h2 className="text-2xl font-forum font-bold">Зарплаты</h2>
        {selectedEmployeeId && (
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
          >
            Скачать PDF
          </button>
        )}
      </div>

      {/* Вкладки с сотрудниками */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {employees.map((employee) => (
          <div
            key={employee.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedEmployeeId === employee.id
                  ? 'bg-[#eae6db] text-black shadow-md'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            onClick={() => {
              if (editingEmployeeId !== employee.id) {
                setSelectedEmployeeId(employee.id);
              }
            }}
          >
            {editingEmployeeId === employee.id ? (
              <input
                type="text"
                value={editEmployeeName}
                onChange={(e) => setEditEmployeeName(e.target.value)}
                onBlur={async () => {
                  if (!editEmployeeName.trim()) {
                    setEditEmployeeName(employee.name);
                  } else if (editEmployeeName.trim() !== employee.name) {
                    await handleRenameEmployee(employee.id, editEmployeeName.trim());
                  }
                  setEditingEmployeeId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setEditEmployeeName(employee.name);
                    setEditingEmployeeId(null);
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
                    setEditingEmployeeId(employee.id);
                    setEditEmployeeName(employee.name);
                  }}
                >
                  {employee.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEmployee(employee.id);
                  }}
                    className={`text-[18px] font-bold hover:scale-110 transition-transform ${
                      selectedEmployeeId === employee.id ? 'text-red-600 hover:text-red-700' : 'text-red-500 hover:text-red-700'
                    }`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
        
        {showNewEmployeeInput ? (
          <div className="flex items-center gap-2">
            <input
              ref={newEmployeeInputRef}
              type="text"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateEmployee();
                } else if (e.key === 'Escape') {
                  setShowNewEmployeeInput(false);
                  setNewEmployeeName('');
                }
              }}
              onBlur={() => {
                if (!newEmployeeName.trim()) {
                  setShowNewEmployeeInput(false);
                }
              }}
              placeholder="Имя сотрудника"
              className="px-3 py-2 border border-[#00000033] rounded-lg focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px]"
              autoFocus
            />
            <button
              onClick={handleCreateEmployee}
              className="px-3 py-2 bg-black text-white rounded-lg hover:bg-[#333] transition-colors cursor-pointer font-forum text-[14px] max-[1599px]:text-[13px]"
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowNewEmployeeInput(true);
              setTimeout(() => newEmployeeInputRef.current?.focus(), 0);
            }}
            className="px-4 py-2 border border-[#00000033] border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[14px] max-[1599px]:text-[13px] font-forum whitespace-nowrap"
          >
            + Новый сотрудник
          </button>
        )}
      </div>

      {/* Таблица зарплат */}
      {selectedEmployeeId ? (
        <>
          <div className="overflow-auto rounded-lg mb-4 p-1.5">
            <table className="border-collapse w-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] sticky left-0 bg-gray-100 z-10 whitespace-nowrap">
                    Месяц
                  </th>
                  <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                    Зарплата
                  </th>
                  <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                    Бонус
                  </th>
                  <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                    Координация
                  </th>
                  <th className="border border-[#00000033] px-1 py-0.5 text-center font-forum font-bold text-[14px] max-[1599px]:text-[13px] whitespace-nowrap">
                    Общая
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
                {salaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-[#00000033] px-3 py-8 text-center text-[#00000080] font-forum">
                      Нет данных. Нажмите "+ Добавить строку" чтобы начать.
                    </td>
                  </tr>
                ) : (
                  salaries.map((salary) => (
                    <Fragment key={salary.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-[#00000033] p-0 sticky left-0 bg-white z-10">
                        <input
                          type="month"
                          value={salary.month.substring(0, 7)}
                          onChange={(e) => {
                            const newMonth = `${e.target.value}-01`;
                            handleUpdateSalary(salary.id, 'month', newMonth);
                          }}
                          onBlur={(e) => {
                            const newMonth = `${e.target.value}-01`;
                            handleSaveSalary(salary.id, 'month', newMonth);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                              handleSaveRow(salary.id);
                            }
                          }}
                          className="w-full px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent"
                        />
                      </td>
                      <td className="border border-[#00000033] p-0">
                        <div className="flex items-center gap-0">
                          <input
                            type="text"
                            value={formatNumber(salary.salary)}
                            onChange={(e) => {
                              const numValue = parseNumber(e.target.value);
                              handleUpdateSalary(salary.id, 'salary', numValue);
                            }}
                            onBlur={(e) => {
                              const numValue = parseNumber(e.target.value);
                              handleSaveSalary(salary.id, 'salary', numValue);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                                handleSaveRow(salary.id);
                              }
                            }}
                            className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                            placeholder="0.00"
                            inputMode="decimal"
                          />
                          <select
                            value={salary.salary_currency || 'грн'}
                            onChange={async (e) => {
                              const newCurrency = e.target.value as 'грн' | 'доллар' | 'евро';
                              handleUpdateSalary(salary.id, 'salary_currency', newCurrency);
                              const updateData = { salary_currency: newCurrency };
                              const updated = await salaryService.updateSalary(salary.id, updateData);
                              if (updated) {
                                setSalaries(prev => prev.map(s => s.id === salary.id ? updated : s));
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
                            value={formatNumber(salary.bonus)}
                            onChange={(e) => {
                              const numValue = parseNumber(e.target.value);
                              handleUpdateSalary(salary.id, 'bonus', numValue);
                            }}
                            onBlur={(e) => {
                              const numValue = parseNumber(e.target.value);
                              handleSaveSalary(salary.id, 'bonus', numValue);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                                handleSaveRow(salary.id);
                              }
                            }}
                            className="flex-1 px-1 py-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[14px] max-[1599px]:text-[13px] bg-transparent text-right"
                            placeholder="0.00"
                            inputMode="decimal"
                          />
                          <select
                            value={salary.bonus_currency || ''}
                            onChange={async (e) => {
                              const newCurrency = e.target.value as 'доллар' | 'евро' | '';
                              const currencyValue = newCurrency || undefined;
                              handleUpdateSalary(salary.id, 'bonus_currency', currencyValue as 'доллар' | 'евро' | undefined);
                              const updateData = { bonus_currency: currencyValue };
                              const updated = await salaryService.updateSalary(salary.id, updateData);
                              if (updated) {
                                setSalaries(prev => prev.map(s => s.id === salary.id ? updated : s));
                              }
                            }}
                            className="px-0.5 py-0.5 -ml-0.5 border-0 focus:ring-2 focus:ring-black focus:outline-none font-forum text-[16px] max-[1599px]:text-[15px] bg-transparent cursor-pointer min-w-[35px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">₴</option>
                            <option value="доллар">$</option>
                            <option value="евро">€</option>
                          </select>
                        </div>
                      </td>
                      <td className="border border-[#00000033] p-0 align-top">
                        <div className="flex flex-col gap-1 p-1.5 min-h-[60px]">
                          {(coordinationPayments[salary.id] || []).map((coord) => (
                            <div key={coord.id} className="flex items-center gap-1 flex-wrap">
                              <input
                                type="text"
                                value={coord.name || ''}
                                onChange={(e) => {
                                  handleUpdateCoordination(coord.id, 'name', e.target.value);
                                }}
                                onBlur={(e) => {
                                  handleSaveCoordination(coord.id, 'name', e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                    handleSaveRow(salary.id);
                                  }
                                }}
                                className="flex-1 min-w-[80px] px-1.5 py-1 border-0 focus:ring-1 focus:ring-black focus:outline-none font-forum text-[12px] max-[1599px]:text-[11px] bg-transparent"
                                placeholder="Ивент"
                              />
                              <span className="text-[#00000080]">-</span>
                              <input
                                type="text"
                                value={formatNumber(coord.amount)}
                                onChange={(e) => {
                                  const numValue = parseNumber(e.target.value);
                                  handleUpdateCoordination(coord.id, 'amount', numValue);
                                }}
                                onBlur={(e) => {
                                  const numValue = parseNumber(e.target.value);
                                  handleSaveCoordination(coord.id, 'amount', numValue);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                    handleSaveRow(salary.id);
                                  }
                                }}
                                className="w-16 px-1 py-1 border-0 focus:ring-1 focus:ring-black focus:outline-none font-forum text-[12px] max-[1599px]:text-[11px] bg-transparent text-right"
                                placeholder="0.00"
                                inputMode="decimal"
                              />
                              <select
                                value={coord.currency || 'грн'}
                                onChange={async (e) => {
                                  const newCurrency = e.target.value as 'грн' | 'доллар' | 'евро';
                                  handleUpdateCoordination(coord.id, 'currency', newCurrency);
                                  const updated = await coordinationService.updateCoordinationPayment(coord.id, { currency: newCurrency });
                                  if (updated) {
                                    setCoordinationPayments(prev => ({
                                      ...prev,
                                      [salary.id]: (prev[salary.id] || []).map(c => c.id === coord.id ? updated : c),
                                    }));
                                    setShowToast(true);
                                  }
                                }}
                                className="px-0.5 py-0.5 border-0 focus:ring-1 focus:ring-black focus:outline-none font-forum text-[13px] max-[1599px]:text-[12px] bg-transparent cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="грн">₴</option>
                                <option value="доллар">$</option>
                                <option value="евро">€</option>
                              </select>
                              {(coordinationPayments[salary.id] || []).length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCoordination(coord.id, salary.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 cursor-pointer text-[14px] font-bold px-1"
                                  title="Удалить"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCoordination(salary.id);
                            }}
                            className="text-[#00000060] hover:text-black text-[11px] font-forum text-left self-start"
                            title="Добавить координацию"
                          >
                            + Добавить
                          </button>
                        </div>
                      </td>
                      <td className="border border-[#00000033] px-1 py-0.5 font-forum text-[14px] max-[1599px]:text-[13px] text-right bg-gray-50 font-semibold">
                        <div className="flex flex-col gap-0.5">
                          <div>Грн: {formatCurrencyAmount(getTotalSync(salary))}</div>
                          {exchangeRates && (
                            <>
                              <div className="text-[12px] text-[#00000080]">USD: {formatCurrencyAmount(getTotalSync(salary) / exchangeRates.usd)}</div>
                              <div className="text-[12px] text-[#00000080]">EUR: {formatCurrencyAmount(getTotalSync(salary) / exchangeRates.eur)}</div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border border-[#00000033] p-1.5 text-center">
                        <button
                          onClick={() => handleSaveRow(salary.id)}
                          className="text-black hover:text-[#1a1a1a] active:scale-95 cursor-pointer transition-all duration-200 text-[13px] max-[1599px]:text-[12px] font-forum"
                          title="Сохранить"
                        >
                          Сохранить
                        </button>
                      </td>
                      <td className="border border-[#00000033] p-1.5 text-center">
                        <button
                          onClick={() => handleDeleteSalary(salary.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer text-[20px] font-bold"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={addRow}
              className="px-3 py-1.5 border border-[#00000033] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-[16px] max-[1599px]:text-[14px] font-forum"
            >
              + Добавить строку
            </button>
          </div>
        </>
      ) : (
        <div className="border border-[#00000033] rounded-lg p-8 text-center">
          <p className="text-[#00000080] font-forum">Создайте сотрудника, чтобы начать работу с зарплатами</p>
        </div>
      )}
    </div>
    </>
  );
};

export default SalariesTab;
