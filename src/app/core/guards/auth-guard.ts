//паозволяет получать сервисі внутри функциональніх гардов
//без использования конструктора
import { inject  } from '@angular/core';

// CanActivateFn — тип функции-защитника, 
// Router — класс для управления навигацией
import { CanActivateFn, Router } from '@angular/router';

//испорт нащ сервис авторизации
import { AuthService } from '../services/auth';

// Объявляем функциональный гард. 
// Принимает сведение о вызываемом маршруте (route) и состоянии (state)
export const authGuard: CanActivateFn = (route, state) => {
  
  //внедряем экземплял сервиса  AuthService для проверки статуса пользователя
  const authService = inject(AuthService);

  //внедряем экземплял   Router чтоб перенапрявлять юзера при необходимости
  const router = inject(Router);

  //проверка сигнала currentUser() Если там лежит объект юзера
  if(authService.currentUser())
  {
    //возвращаем true (ангуляр разрешает переход на защищенную страницу)
    return true;
  }

  router.navigate(['/login']);
  //если пользователь не залогинен то отправляем на страницу входа

  // Возвращаем false — блокируем переход на исходно запрашиваемый маршрут
  return false;
};
