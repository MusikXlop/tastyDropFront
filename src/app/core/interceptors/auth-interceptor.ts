// Автоматически перехватывает абсолютно каждый исходящий HTTP-запрос
//  и приписывает к нему заголовок Authorization: Bearer <TOKEN>, 
// избавив от ручной рутины.

import { HttpInterceptorFn } from '@angular/common/http';
//ФУНКЦИЯ INJECT позволяет получать экземпляры сервисов без конструктора
import { inject } from '@angular/core';

//испортируем наш сервис авторизации
import { AuthService } from '../services/auth';




//экспортируем функцию перехватчика
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  //получаем достум к authservice
  const authService = inject(AuthService);
  //запрашиваем текущий токен
  const token = authService.getToken();
  
  //если токен найдет в памяти
  if(token)
  {
    //создаем клон исходного запроса с подмешанным заголовком Authorization
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    //передаем модифицированный запрос длальше по цепочке
    return next(clonedReq);

  }
  //если токена нет то отправляем исходный запрос без изменений
  return next(req);
};
