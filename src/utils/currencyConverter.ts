// Утилита для конвертации валют

export type Currency = 'грн' | 'доллар' | 'евро';

export interface ExchangeRates {
  usd: number; // Курс доллара к гривне
  eur: number; // Курс евро к гривне
}

// Курсы валют (можно обновлять через API или хранить в настройках)
// По умолчанию используем примерные курсы
const DEFAULT_RATES: ExchangeRates = {
  usd: 42, // 1 USD = 42 UAH
  eur: 49, // 1 EUR = 49 UAH
};

// Получить курсы валют через API
export const getExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    // Используем бесплатный API exchangerate-api.com (не требует ключа)
    // API возвращает курсы, где базовая валюта - UAH
    // Например: rates.USD = 0.026 означает, что за 1 UAH можно купить 0.026 USD
    // Нам нужно обратное: сколько UAH за 1 USD = 1 / 0.026 = 38.46
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/UAH');
    if (!response.ok) {
      throw new Error('Ошибка получения курсов валют');
    }
    const data = await response.json();
    
    // Инвертируем курсы: если API возвращает сколько USD за 1 UAH,
    // то нам нужно сколько UAH за 1 USD
    const usdRate = data.rates?.USD;
    const eurRate = data.rates?.EUR;
    
    return {
      usd: usdRate && usdRate > 0 ? 1 / usdRate : DEFAULT_RATES.usd,
      eur: eurRate && eurRate > 0 ? 1 / eurRate : DEFAULT_RATES.eur,
    };
  } catch (error) {
    console.error('Ошибка получения курсов валют:', error);
    // В случае ошибки используем дефолтные курсы
    return DEFAULT_RATES;
  }
};

// Конвертировать сумму из одной валюты в другую
export const convertCurrency = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: ExchangeRates
): number => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Сначала конвертируем в гривны
  let amountInUAH = amount;
  if (fromCurrency === 'доллар') {
    amountInUAH = amount * rates.usd;
  } else if (fromCurrency === 'евро') {
    amountInUAH = amount * rates.eur;
  }

  // Затем конвертируем из гривны в целевую валюту
  if (toCurrency === 'грн') {
    return amountInUAH;
  } else if (toCurrency === 'доллар') {
    return amountInUAH / rates.usd;
  } else if (toCurrency === 'евро') {
    return amountInUAH / rates.eur;
  }

  return amount;
};

// Получить итоговую сумму в разных валютах
export const getTotalInAllCurrencies = async (
  amounts: Array<{ amount: number; currency: Currency }>
): Promise<{ грн: number; доллар: number; евро: number }> => {
  const rates = await getExchangeRates();
  
  let totalUAH = 0;
  
  // Суммируем все суммы в гривнах
  amounts.forEach(({ amount, currency }) => {
    if (currency === 'грн') {
      totalUAH += amount;
    } else if (currency === 'доллар') {
      totalUAH += amount * rates.usd;
    } else if (currency === 'евро') {
      totalUAH += amount * rates.eur;
    }
  });

  return {
    грн: totalUAH,
    доллар: totalUAH / rates.usd,
    евро: totalUAH / rates.eur,
  };
};

// Форматировать число: округлить до целых и добавить разделители тысяч
export const formatCurrencyAmount = (amount: number): string => {
  const rounded = Math.round(amount);
  // Форматируем с пробелами как разделителями тысяч
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

