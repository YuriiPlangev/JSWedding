# Инструкция по деплою на Vercel

## Шаги для деплоя:

### 1. Подготовка репозитория
- Убедитесь, что ваш код закоммичен и запушен в GitHub/GitLab/Bitbucket
- Если репозитория нет, создайте его:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
  git push -u origin main
  ```

### 2. Создание аккаунта на Vercel
1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Sign Up" и войдите через GitHub/GitLab/Bitbucket (рекомендуется)

### 3. Импорт проекта
1. В дашборде Vercel нажмите "Add New..." → "Project"
2. Выберите ваш репозиторий из списка
3. Нажмите "Import"

### 4. Настройка переменных окружения
В разделе "Environment Variables" добавьте:
- `VITE_SUPABASE_URL` - URL вашего Supabase проекта
- `VITE_SUPABASE_ANON_KEY` - Anon Key из настроек Supabase

**Где найти эти значения:**
1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в Settings → API
3. Скопируйте:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 5. Настройка проекта
Vercel автоматически определит:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Если что-то не определилось автоматически, настройте вручную.

### 6. Деплой
1. Нажмите "Deploy"
2. Дождитесь завершения сборки (обычно 1-3 минуты)
3. После успешного деплоя вы получите URL вида: `your-project.vercel.app`

### 7. Настройка домена (опционально)
1. В настройках проекта перейдите в "Domains"
2. Добавьте свой домен, если нужно

## Важные моменты:

### Переменные окружения
Убедитесь, что переменные окружения добавлены для всех окружений:
- Production
- Preview
- Development

### CORS настройки в Supabase
После деплоя добавьте URL вашего Vercel проекта в настройки CORS в Supabase:
1. Settings → API → CORS
2. Добавьте ваш Vercel URL (например: `https://your-project.vercel.app`)

### Автоматические деплои
- Каждый push в `main` ветку → деплой в Production
- Pull Request → Preview деплой
- Другие ветки → Preview деплой

## Troubleshooting

### Ошибка "Missing Supabase environment variables"
- Убедитесь, что переменные окружения добавлены в Vercel
- Проверьте, что они начинаются с `VITE_`
- Пересоберите проект после добавления переменных

### Ошибка 404 на всех страницах
- Убедитесь, что файл `vercel.json` присутствует в корне проекта
- Проверьте настройку `rewrites` в `vercel.json`

### Проблемы с путями к статическим файлам
- Убедитесь, что все импорты используют относительные пути
- Проверьте, что файлы в `public` доступны

## Полезные ссылки:
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)

