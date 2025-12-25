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
    welcomeText: string;
    descriptionText: string;
  };
  header: {
    contactUs: string;
    logout: string;
    notes: string;
    notesTitle: string;
    notesPlaceholder: string;
    close: string;
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
  presentation: {
    title: string;
    sections: string;
  };
  common: {
    download: string;
    downloadDocument: string;
    downloadError: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    create: string;
    close: string;
    back: string;
    details: string;
    more: string;
    yes: string;
    no: string;
  };
  organizer: {
    projects: string;
    addProject: string;
    createFirstProject: string;
    noProjects: string;
    editProject: string;
    deleteProject: string;
    deleteProjectConfirm: string;
    projectInfo: string;
    weddingDate: string;
    country: string;
    place: string;
    guestCount: string;
    client: string;
    clientNotes: string;
    tasks: string;
    addTask: string;
    editTask: string;
    taskText: string;
    deleteTask: string;
    deleteTaskConfirm: string;
    taskStatus: {
      completed: string;
      inProgress: string;
      pending: string;
    };
    dueDate: string;
    documents: string;
    addDocument: string;
    editDocument: string;
    deleteDocument: string;
    deleteDocumentConfirm: string;
    documentName: string;
    documentLink: string;
    linkText: string;
    presentation: string;
    deletePresentation: string;
    deletePresentationConfirm: string;
    backToProjects: string;
    saveError: string;
    deleteError: string;
    createError: string;
    updateError: string;
    loadError: string;
    chat: string;
    pinned: string;
    openLink: string;
    size: string;
    type: string;
    noDocuments: string;
    weddingPresentation: string;
    defaultCompanyPresentation: string;
    sections: string;
    welcomeMessageEn: string;
    welcomeMessageEnHint: string;
    partner1NameEn: string;
    partner1NameRu: string;
    partner2NameEn: string;
    partner2NameRu: string;
    selectClient: string;
    countryEn: string;
    countryRu: string;
    countryUa: string;
    fullWelcomeTextEn: string;
    fullWelcomeTextEnHint: string;
    splashWelcomeTextEn: string;
    splashWelcomeTextEnHint: string;
    chatLink: string;
    overview: string;
    viewAll: string;
  };
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
      welcomeText: 'We are happy to welcome you to your personal planning space.',
      descriptionText: 'From this moment on, you\'re in trusted hands. Let\'s design a celebration that feels unmistakably yours.',
    },
    header: {
      contactUs: 'Contact us directly',
      logout: 'Logout',
      notes: 'Leave your notes',
      notesTitle: 'Notes',
      notesPlaceholder: 'Leave your notes here...',
      close: 'Close',
    },
    dashboard: {
      welcome: 'welcome to your wedding organization space!',
      viewControl: 'View and control every stage of your celebration',
      weddingDetails: 'Event details',
      keyDetails: 'Key details about your celebration ',
      weddingDate: 'event date',
      venue: 'location',
      celebrationPlace: 'venue',
      awaitingSelection: 'Awaiting Selection',
      numberOfGuests: 'number of Guests',
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
    presentation: {
      title: 'Company presentation',
      sections: 'presentation sections',
    },
    common: {
      download: 'Download',
      downloadDocument: 'Download document',
      downloadError: 'Error downloading document. Please refresh the page.',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      close: 'Close',
      back: 'Back',
      details: 'Details',
      more: 'More',
      yes: 'Yes',
      no: 'No',
    },
    organizer: {
      projects: 'Projects',
      addProject: 'Add Project',
      createFirstProject: 'Create First Project',
      noProjects: 'You don\'t have any projects yet',
      editProject: 'Edit Project',
      deleteProject: 'Delete Project',
      deleteProjectConfirm: 'Are you sure you want to delete this project? This action cannot be undone.',
      projectInfo: 'Project Information',
      weddingDate: 'Wedding Date',
      country: 'Country',
      place: 'Place',
      guestCount: 'Number of Guests',
      client: 'Client',
      clientNotes: 'Client Notes',
      tasks: 'Tasks',
      addTask: 'Add Task',
      editTask: 'Edit Task',
      taskText: 'Task Text',
      deleteTask: 'Delete Task',
      deleteTaskConfirm: 'Are you sure you want to delete this task?',
      taskStatus: {
        completed: 'Completed',
        inProgress: 'In Progress',
        pending: 'Pending',
      },
      dueDate: 'Due',
      documents: 'Documents',
      addDocument: 'Add Document',
      editDocument: 'Edit Document',
      deleteDocument: 'Delete Document',
      deleteDocumentConfirm: 'Are you sure you want to delete this document?',
      documentName: 'Document Name',
      documentLink: 'Document Link',
      linkText: 'Link Text',
      presentation: 'Presentation',
      deletePresentation: 'Delete Presentation',
      deletePresentationConfirm: 'Are you sure you want to delete the wedding presentation? After deletion, the default company presentation will be shown.',
      backToProjects: '← Back to Projects',
      saveError: 'Failed to save. Please check your internet connection and try again.',
      deleteError: 'Failed to delete',
      createError: 'Failed to create. Please check your internet connection and try again.',
      updateError: 'Failed to update. Please check your internet connection and try again.',
      loadError: 'Error loading data. Please refresh the page.',
      chat: 'Chat',
      pinned: 'Pinned',
      openLink: 'Open link →',
      size: 'Size',
      type: 'Type',
      noDocuments: 'No documents yet',
      weddingPresentation: 'Wedding Presentation',
      defaultCompanyPresentation: 'Company Presentation (default)',
      sections: 'Sections',
      welcomeMessageEn: 'Welcome Message (EN)',
      welcomeMessageEnHint: 'If not filled, the default English message will be used',
      partner1NameEn: 'Partner 1 Name (EN)',
      partner1NameRu: 'Partner 1 Name (RU)',
      partner2NameEn: 'Partner 2 Name (EN)',
      partner2NameRu: 'Partner 2 Name (RU)',
      selectClient: 'Select Client',
      countryEn: 'Country (EN)',
      countryRu: 'Country (RU)',
      countryUa: 'Country (UA)',
      fullWelcomeTextEn: 'Full Welcome Text in Main Content (EN)',
      fullWelcomeTextEnHint: 'If not filled, format will be used: Name1 & Name2, Welcome to your wedding organization space!',
      splashWelcomeTextEn: 'Welcome Text in Splash Screen (EN)',
      splashWelcomeTextEnHint: 'Text displayed below the couple names. If not filled, standard text will be used: Welcome to your wedding organization space!',
      chatLink: 'Chat Link',
      overview: 'Overview',
      viewAll: 'View all →',
    },
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
      welcomeText: 'Мы рады приветствовать вас в вашем личном пространстве планирования.',
      descriptionText: 'С этого момента вы в надежных руках. Давайте создадим празднование, которое будет безошибочно вашим.',
    },
    header: {
      contactUs: 'Свяжитесь с нами',
      logout: 'Выйти',
      notes: 'Оставьте заметки',
      notesTitle: 'Заметки',
      notesPlaceholder: 'Оставьте свои заметки здесь...',
      close: 'Закрыть',
    },
    dashboard: {
      welcome: 'добро пожаловать в ваше пространство для организации свадеб!',
      viewControl: 'Просматривайте и контролируйте каждый этап подготовки',
      weddingDetails: 'Детали праздника',
      keyDetails: 'Ключевая информация вашего события',
      weddingDate: 'дата события',
      venue: 'страна',
      celebrationPlace: 'локация',
      awaitingSelection: 'Ожидается выбор',
      numberOfGuests: 'количество гостей',
      days: 'дней',
      daysTillCelebration: 'до вашего праздника',
      tasks: 'Задания',
      tasksDescription: 'Список задач, которые вам нужно выполнить в первую очередь',
      documents: 'Документация',
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
    presentation: {
      title: 'Презентация компании',
      sections: 'разделы презентации',
    },
    common: {
      download: 'Скачать',
      downloadDocument: 'Скачать документ',
      downloadError: 'Ошибка при скачивании документа. Попробуйте обновить страницу.',
      edit: 'Редактировать',
      delete: 'Удалить',
      save: 'Сохранить',
      cancel: 'Отмена',
      create: 'Создать',
      close: 'Закрыть',
      back: 'Назад',
      details: 'Подробнее',
      more: 'Подробнее',
      yes: 'Да',
      no: 'Нет',
    },
    organizer: {
      projects: 'Проекты',
      addProject: 'Добавить проект',
      createFirstProject: 'Создать первый проект',
      noProjects: 'У вас пока нет проектов',
      editProject: 'Редактировать проект',
      deleteProject: 'Удалить проект',
      deleteProjectConfirm: 'Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.',
      projectInfo: 'Информация о проекте',
      weddingDate: 'Дата ивента',
      country: 'Страна',
      place: 'Место',
      guestCount: 'Количество гостей',
      client: 'Клиент',
      clientNotes: 'Заметки клиента',
      tasks: 'Задачи',
      addTask: 'Добавить задачу',
      editTask: 'Редактировать задачу',
      taskText: 'Текст задачи',
      deleteTask: 'Удалить задачу',
      deleteTaskConfirm: 'Вы уверены, что хотите удалить эту задачу?',
      taskStatus: {
        completed: 'Выполнено',
        inProgress: 'В работе',
        pending: 'Ожидает',
      },
      dueDate: 'До',
      documents: 'Документы',
      addDocument: 'Добавить документ',
      editDocument: 'Редактировать документ',
      deleteDocument: 'Удалить документ',
      deleteDocumentConfirm: 'Вы уверены, что хотите удалить этот документ?',
      documentName: 'Название документа',
      documentLink: 'Ссылка на документ',
      linkText: 'Текст ссылки',
      presentation: 'Презентация',
      deletePresentation: 'Удалить презентацию',
      deletePresentationConfirm: 'Вы уверены, что хотите удалить презентацию свадьбы? После удаления будет показана презентация компании по умолчанию.',
      backToProjects: '← Назад к списку проектов',
      saveError: 'Не удалось сохранить. Проверьте подключение к интернету и попробуйте снова.',
      deleteError: 'Не удалось удалить',
      createError: 'Не удалось создать. Проверьте подключение к интернету и попробуйте снова.',
      updateError: 'Не удалось обновить. Проверьте подключение к интернету и попробуйте снова.',
      loadError: 'Ошибка при загрузке данных. Попробуйте обновить страницу.',
      chat: 'Чат',
      pinned: 'Закреплен',
      openLink: 'Открыть ссылку →',
      size: 'Размер',
      type: 'Тип',
      noDocuments: 'Документов пока нет',
      weddingPresentation: 'Презентация свадьбы',
      defaultCompanyPresentation: 'Презентация компании (по умолчанию)',
      sections: 'Секций',
      welcomeMessageEn: 'Приветственное сообщение (EN)',
      welcomeMessageEnHint: 'Если не заполнено, будет использоваться стандартное сообщение на английском',
      partner1NameEn: 'Имя партнера 1 (EN)',
      partner1NameRu: 'Имя партнера 1 (RU)',
      partner2NameEn: 'Имя партнера 2 (EN)',
      partner2NameRu: 'Имя партнера 2 (RU)',
      selectClient: 'Выберите клиента',
      countryEn: 'Страна (EN)',
      countryRu: 'Страна (RU)',
      countryUa: 'Страна (UA)',
      fullWelcomeTextEn: 'Полный текст приветствия в основном контенте (EN)',
      fullWelcomeTextEnHint: 'Если не заполнено, будет использоваться формат: Имя1 & Имя2, Welcome to your wedding organization space!',
      splashWelcomeTextEn: 'Текст приветствия в заглушке (EN)',
      splashWelcomeTextEnHint: 'Текст, который отображается под именами пары. Если не заполнено, будет использоваться стандартный текст: Welcome to your wedding organization space!',
      chatLink: 'Ссылка на чат',
      overview: 'Обзор',
      viewAll: 'Смотреть все →',
    },
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
      welcomeText: 'Ми раді вітати вас у вашому особистому просторі планування.',
      descriptionText: 'З цього моменту ви в надійних руках. Давайте створимо святкування, яке буде безпомилково вашим.',
    },
    header: {
      contactUs: 'Зв\'яжіться з нами',
      logout: 'Вийти',
      notes: 'Залиште нотатки',
      notesTitle: 'Нотатки',
      notesPlaceholder: 'Залиште свої нотатки тут...',
      close: 'Закрити',
    },
    dashboard: {
      welcome: 'Ласкаво просимо до простору організації вашої весілля!',
      viewControl: 'Переглядайте та контролюйте кожен етап вашого свята',
      weddingDetails: 'Деталі свята',
      keyDetails: 'Основна інформація про вашу подію',
      weddingDate: 'дата весілля',
      venue: 'країна',
      celebrationPlace: 'локація',
      awaitingSelection: 'Очікується вибір',
      numberOfGuests: 'кількість гостей',
      days: 'днів',
      daysTillCelebration: 'до вашого свята',
      tasks: 'Завдання',
      tasksDescription: 'список завдань, які вам потрібно виконати найближчим часом ',
      documents: 'Документація',
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
    presentation: {
      title: 'Презентація компанії',
      sections: 'розділи презентації',
    },
    common: {
      download: 'Завантажити',
      downloadDocument: 'Завантажити документ',
      downloadError: 'Помилка при завантаженні документа. Спробуйте оновити сторінку.',
      edit: 'Редагувати',
      delete: 'Видалити',
      save: 'Зберегти',
      cancel: 'Скасувати',
      create: 'Створити',
      close: 'Закрити',
      back: 'Назад',
      details: 'Деталі',
      more: 'Детальніше',
      yes: 'Так',
      no: 'Ні',
    },
    organizer: {
      projects: 'Проєкти',
      addProject: 'Додати проєкт',
      createFirstProject: 'Створити перший проєкт',
      noProjects: 'У вас поки немає проєктів',
      editProject: 'Редагувати проєкт',
      deleteProject: 'Видалити проєкт',
      deleteProjectConfirm: 'Ви впевнені, що хочете видалити цей проєкт? Цю дію неможливо скасувати.',
      projectInfo: 'Інформація про проєкт',
      weddingDate: 'Дата події',
      country: 'Країна',
      place: 'Місце',
      guestCount: 'Кількість гостей',
      client: 'Клієнт',
      clientNotes: 'Нотатки клієнта',
      tasks: 'Завдання',
      addTask: 'Додати завдання',
      editTask: 'Редагувати завдання',
      taskText: 'Текст завдання',
      deleteTask: 'Видалити завдання',
      deleteTaskConfirm: 'Ви впевнені, що хочете видалити це завдання?',
      taskStatus: {
        completed: 'Виконано',
        inProgress: 'В роботі',
        pending: 'Очікує',
      },
      dueDate: 'До',
      documents: 'Документи',
      addDocument: 'Додати документ',
      editDocument: 'Редагувати документ',
      deleteDocument: 'Видалити документ',
      deleteDocumentConfirm: 'Ви впевнені, що хочете видалити цей документ?',
      documentName: 'Назва документа',
      documentLink: 'Посилання на документ',
      linkText: 'Текст посилання',
      presentation: 'Презентація',
      deletePresentation: 'Видалити презентацію',
      deletePresentationConfirm: 'Ви впевнені, що хочете видалити презентацію весілля? Після видалення буде показано презентацію компанії за замовчуванням.',
      backToProjects: '← Назад до списку проєктів',
      saveError: 'Не вдалося зберегти. Перевірте підключення до інтернету та спробуйте ще раз.',
      deleteError: 'Не вдалося видалити',
      createError: 'Не вдалося створити. Перевірте підключення до інтернету та спробуйте ще раз.',
      updateError: 'Не вдалося оновити. Перевірте підключення до інтернету та спробуйте ще раз.',
      loadError: 'Помилка при завантаженні даних. Спробуйте оновити сторінку.',
      chat: 'Чат',
      pinned: 'Закріплено',
      openLink: 'Відкрити посилання →',
      size: 'Розмір',
      type: 'Тип',
      noDocuments: 'Документів поки немає',
      weddingPresentation: 'Презентація весілля',
      defaultCompanyPresentation: 'Презентація компанії (за замовчуванням)',
      sections: 'Секцій',
      welcomeMessageEn: 'Привітальне повідомлення (EN)',
      welcomeMessageEnHint: 'Якщо не заповнено, буде використано стандартне повідомлення англійською',
      partner1NameEn: 'Ім\'я партнера 1 (EN)',
      partner1NameRu: 'Ім\'я партнера 1 (RU)',
      partner2NameEn: 'Ім\'я партнера 2 (EN)',
      partner2NameRu: 'Ім\'я партнера 2 (RU)',
      selectClient: 'Виберіть клієнта',
      countryEn: 'Країна (EN)',
      countryRu: 'Країна (RU)',
      countryUa: 'Країна (UA)',
      fullWelcomeTextEn: 'Повний текст привітання в основному контенті (EN)',
      fullWelcomeTextEnHint: 'Якщо не заповнено, буде використано формат: Ім\'я1 & Ім\'я2, Welcome to your wedding organization space!',
      splashWelcomeTextEn: 'Текст привітання в заглушці (EN)',
      splashWelcomeTextEnHint: 'Текст, який відображається під іменами пари. Якщо не заповнено, буде використано стандартний текст: Welcome to your wedding organization space!',
      chatLink: 'Посилання на чат',
      overview: 'Огляд',
      viewAll: 'Переглянути все →',
    },
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

