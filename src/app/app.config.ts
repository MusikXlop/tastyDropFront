// Главный конфигурационный файл Standalone-архитектуры Angular.
//  Регистрирует провайдеры роутинга, HTTP-клиента и интерцепторов.

// Тип конфигурации приложения и функция оптимизации зоны обнаружения изменений
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

//маршруты страниц
import { provideRouter } from '@angular/router';

//провайдеры для включение HttpClient и связывания его с интерцепторами 
import { provideHttpClient, withInterceptors } from '@angular/common/http';

//испорт всех маррутов
import { routes } from './app.routes';

//испортируем наш функциональный http интецептор
import { authInterceptor } from './core/interceptors/auth-interceptor';


//export объект глобальной функции 
export const appConfig: ApplicationConfig = {
  //массив провайдеров (сервисов и настроект каркаса)
  providers: [
    //включаем групировку событий для повышение производительности калдров UI
    provideZoneChangeDetection({eventCoalescing: true}),
    //регистрируем таблицы роутинга
    provideRouter(routes),
    // Регистрируем глобальный HttpClient
    provideHttpClient( 
      // Подключаем наш массив перехватчиков (включая  jwtInterceptor authInterceptor)
      withInterceptors([authInterceptor])
      )
  ]
};
