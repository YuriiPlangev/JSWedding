import { supabase } from '../lib/supabase';

/**
 * Альтернативный способ создания пользователя через обычный signUp API
 * Этот способ можно использовать на клиенте, но потребует подтверждения email
 * 
 * ВАЖНО: Для создания свадьбы вам понадобится ID организатора
 */
export async function createUserWithWeddingClient(
  email: string,
  password: string,
  coupleName1: string,
  coupleName2: string,
  weddingDate: string,
  venue: string,
  country: string,
  organizerId: string,
  guestCount: number = 0
) {
  try {
    // 1. Создаем пользователя через signUp
    console.log('Создание пользователя...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${coupleName1} & ${coupleName2}`,
          role: 'client',
        },
      },
    });

    if (authError) {
      throw new Error(`Ошибка при создании пользователя: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Не удалось создать пользователя');
    }

    const userId = authData.user.id;
    console.log(`Пользователь создан с ID: ${userId}`);

    // 2. Профиль должен создаться автоматически через триггер, но можем создать вручную
    console.log('Создание профиля...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        name: `${coupleName1} & ${coupleName2}`,
        role: 'client',
      });

    if (profileError && profileError.code !== '23505') { // 23505 = unique violation (уже существует)
      console.warn(`Предупреждение при создании профиля: ${profileError.message}`);
    }

    // 3. Создаем свадьбу
    console.log('Создание свадьбы...');
    const { data: weddingData, error: weddingError } = await supabase
      .from('weddings')
      .insert({
        client_id: userId,
        organizer_id: organizerId,
        couple_name_1: coupleName1,
        couple_name_2: coupleName2,
        wedding_date: weddingDate,
        venue: venue,
        country: country,
        guest_count: guestCount,
      })
      .select()
      .single();

    if (weddingError) {
      throw new Error(`Ошибка при создании свадьбы: ${weddingError.message}`);
    }

    console.log('✅ Пользователь и свадьба успешно созданы!');
    console.log('Данные пользователя:', {
      id: userId,
      email: email,
      couple: `${coupleName1} & ${coupleName2}`,
    });
    console.log('Данные свадьбы:', weddingData);

    return {
      user: authData.user,
      wedding: weddingData,
    };
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    throw error;
  }
}

/**
 * Функция для создания пользователя Константин & Диана
 * Использование: 
 * 1. Импортируйте функцию в консоли браузера
 * 2. Вызовите функцию с нужными параметрами
 */
export async function createKonstantinDianaClient(
  email: string,
  password: string,
  organizerId: string
) {
  return await createUserWithWeddingClient(
    email,
    password,
    'Константин',
    'Диана',
    '2026-05-28',
    'One & Only - заведение',
    'Черногория',
    organizerId,
    0
  );
}

