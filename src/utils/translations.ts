/**
 * Система переводов для приложения
 */

export type Language = 'en' | 'ru' | 'ua';

export interface Translations {
  welcome: {
    splash: string;
    scrollDown: string;
  };
  login: {
    enterAccount: string;
    description: string;
    email: string;
    password: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    startPreparation: string;
    error: string;
  };
  header: {
    contactUs: string;
    logout: string;
  };
  dashboard: {
    welcome: string;
    viewControl: string;
    weddingDetails: string;
    keyDetails: string;
    weddingDate: string;
    venue: string;
    celebrationPlace: string;
    awaitingSelection: string;
    numberOfGuests: string;
    days: string;
    daysTillCelebration: string;
    tasks: string;
    tasksDescription: string;
    documents: string;
    pinnedDocuments: string;
  };
  months: {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
  };
  year: string;
}

const translations: Record<Language, Translations> = {
  en: {
    welcome: {
      splash: 'Welcome to your wedding organization space!',
      scrollDown: 'Scroll down to continue',
    },
    login: {
      enterAccount: 'Enter your account',
      description: "Here you'll find all documents, timelines, updates, and planning tools – everything you need to feel confident, informed, and supported at every stage.",
      email: 'Email',
      password: 'Password',
      emailPlaceholder: 'Enter your Email',
      passwordPlaceholder: 'Enter your password',
      startPreparation: 'Start the preparation',
      error: 'Invalid email or password',
    },
    header: {
      contactUs: 'Contact us directly',
      logout: 'Logout',
    },
    dashboard: {
      welcome: 'Welcome to your weeding organization space!',
      viewControl: 'View and control every stage of your celebration',
      weddingDetails: 'Weeding details',
      keyDetails: 'Key details about your special day',
      weddingDate: 'wedding date',
      venue: 'Location',
      celebrationPlace: 'Venue',
      awaitingSelection: 'Awaiting Selection',
      numberOfGuests: 'Number of Guests',
      days: 'days',
      daysTillCelebration: 'till your celebration',
      tasks: 'Tasks',
      tasksDescription: 'Wedding planning checklist you need to complete',
      documents: 'Documents',
      pinnedDocuments: 'Pinned documents',
    },
    months: {
      january: 'january',
      february: 'february',
      march: 'march',
      april: 'april',
      may: 'may',
      june: 'june',
      july: 'july',
      august: 'august',
      september: 'september',
      october: 'october',
      november: 'november',
      december: 'december',
    },
    year: 'year',
  },
  ru: {
    welcome: {
      splash: 'Добро пожаловать в пространство планирования вашей свадьбы!',
      scrollDown: 'Листай вниз',
    },
    login: {
      enterAccount: 'Войдите в свой аккаунт',
      description: 'Здесь вы найдете все документы, временные рамки, обновления и инструменты планирования - все, что нужно для уверенности, информированности и поддержки на каждом этапе.',
      email: 'Email',
      password: 'Пароль',
      emailPlaceholder: 'Введите ваш Email',
      passwordPlaceholder: 'Введите ваш пароль',
      startPreparation: 'Начать подготовку',
      error: 'Неверный email или пароль',
    },
    header: {
      contactUs: 'Свяжитесь с нами',
      logout: 'Выйти',
    },
    dashboard: {
      welcome: 'добро пожаловать в ваше пространство для организации свадеб!',
      viewControl: 'Просматривайте и контролируйте каждый этап подготовки',
      weddingDetails: 'Детали свадьбы',
      keyDetails: 'Ключевые детали вашего особенного дня',
      weddingDate: 'дата свадьбы',
      venue: 'страна',
      celebrationPlace: 'локация',
      awaitingSelection: 'Ожидается выбор',
      numberOfGuests: 'количество гостей',
      days: 'дней',
      daysTillCelebration: 'до вашей свадьбы',
      tasks: 'Задания',
      tasksDescription: 'Список задач, которые вам нужно выполнить в первую очередь',
      documents: 'Документы',
      pinnedDocuments: 'Закрепленные документы',
    },
    months: {
      january: 'января',
      february: 'февраля',
      march: 'марта',
      april: 'апреля',
      may: 'мая',
      june: 'июня',
      july: 'июля',
      august: 'августа',
      september: 'сентября',
      october: 'октября',
      november: 'ноября',
      december: 'декабря',
    },
    year: 'год',
  },
  ua: {
    welcome: {
      splash: 'Ласкаво просимо до простору планування вашої весілля!',
      scrollDown: 'Прокрутіть вниз',
    },
    login: {
      enterAccount: 'Увійдіть до свого акаунту',
      description: 'Тут ви знайдете всі документи, часові рамки, оновлення та інструменти планування - все, що потрібно для впевненості, інформованості та підтримки на кожному етапі.',
      email: 'Email',
      password: 'Пароль',
      emailPlaceholder: 'Введіть ваш Email',
      passwordPlaceholder: 'Введіть ваш пароль',
      startPreparation: 'Почати підготовку',
      error: 'Невірний email або пароль',
    },
    header: {
      contactUs: 'Зв\'яжіться з нами',
      logout: 'Вийти',
    },
    dashboard: {
      welcome: 'Ласкаво просимо до простору організації вашої весілля!',
      viewControl: 'Переглядайте та контролюйте кожен етап вашого свята',
      weddingDetails: 'Деталі весілля',
      keyDetails: 'Ключові деталі вашого особливого дня',
      weddingDate: 'дата весілля',
      venue: 'Місце',
      celebrationPlace: 'Місце святкування',
      awaitingSelection: 'Очікується вибір',
      numberOfGuests: 'Кількість гостей',
      days: 'днів',
      daysTillCelebration: 'до вашого свята',
      tasks: 'Завдання',
      tasksDescription: 'Чеклист планування весілля, який вам потрібно виконати',
      documents: 'Документи',
      pinnedDocuments: 'закріплені документи',
    },
    months: {
      january: 'січня',
      february: 'лютого',
      march: 'березня',
      april: 'квітня',
      may: 'травня',
      june: 'червня',
      july: 'липня',
      august: 'серпня',
      september: 'вересня',
      october: 'жовтня',
      november: 'листопада',
      december: 'грудня',
    },
    year: 'рік',
  },
};

export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.en;
}

// Вспомогательная функция для получения перевода по ключу (например, 'welcome.splash')
export function getTranslationByKey(key: string, lang: Language): string {
  const translation = translations[lang] || translations.en;
  const keys = key.split('.');
  let value: unknown = translation;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

