//Это сервисный класс-синглтон. Он выполняет сетевые запросы к 
// .NET API, сохраняет JWT-токен в локальное хранилище браузера (localStorage) 
// и хранит реактивное состояние авторизации.


// Декоратор Injectable позволяет внедрять этот сервис в любые компоненты, 
// signal  новый механизм реактивности в Angular
import { Injectable, signal } from '@angular/core';

//встроенный модуль для отправки http запросов на бэкенд
import { HttpClient } from '@angular/common/http';

// Observable потом данных RxJS
//tap оператор выполнения побочных действий без изменения потока
import { Observable,tap } from 'rxjs';

//импортируем созданные ранее DTO интерфейсы
import { AuthResponseDto, LoginDto, RegisterDto,ConfirmEmailDto,RegisterResponseDto } from '../models/auth.model';

//регистрируем сервис в корневом инжекторе приложения
//(будет единственный экземпляр на весь сайт)
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    //базовый url контроллер авторизации 
    private readonly apiUrl = 'https://localhost:7141/api/auth';

    //сигнал с именем юзера(берем значение из localstorage при старте)
    currentUser = signal<string | null>(localStorage.getItem('username'));

    //сигнал баланса(парсит сохраненную сумму из localstorage или ставит 0 )
    currentBalance = signal<number>(Number(localStorage.getItem('balance') || 0));


    //сигнал для баланса с бп 
    currentBpBalance = signal<number>(Number(localStorage.getItem('bpBalance') || 0));


    //внедрем httpClien через конструктор для отправки запросов 
    constructor(private http: HttpClient){}


    // геттер-алиас, чтобы components могли вызывать battlePassBalance()
    get battlePassBalance() {
        return this.currentBpBalance;
    }


    // Метод для централизованного обновления баланса из любых сторонних компонентов/сервисов
    updateBalance(newBalance: number): void {
    this.currentBalance.set(newBalance);
    localStorage.setItem('balance', newBalance.toString());
    }


    //для апдейта бп баланса
    updateBpBalance(newBpBalance: number):void {
        this.currentBpBalance.set(newBpBalance);
        localStorage.setItem('bpBalance', newBpBalance.toString());
    }





    //1 метод регистрации (отправляем данные) бекенд высылает код на почту
    register(dto: RegisterDto): Observable<RegisterResponseDto> {
        return this.http.post<RegisterResponseDto>(`${this.apiUrl}/register`, dto);
    }

    //2 метод подтверждения кода (проверяет 6 значный код и получает JWT)
    confirmEmail(dto: ConfirmEmailDto): Observable<AuthResponseDto> {
        return this.http.post<AuthResponseDto>(`${this.apiUrl}/confirm-email`,dto).pipe (
            //при успешном вводе кода обновляем localstorage and signal 
            tap(res => this.setSession(res))
        )
    }

    
       

    // Метод входа логину/паролю
    login(dto: LoginDto): Observable<AuthResponseDto> {
        return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, dto).pipe(
            tap(res => this.setSession(res))
        );
    }


    //метод выхода из учетной запили 
    logout(): void {
        //удаляем токен из памяти браузера 
        localStorage.removeItem('token');
        //удаляем логин юзера из памяти браузера
        localStorage.removeItem('username');
        //удаляем баланс из памяти браузера
        localStorage.removeItem('balance');

        localStorage.removeItem('userId');

        //очищаем бп баланс при выхоже
        localStorage.removeItem('bpBalance');


        //сбрасываем сигнал пользователя в null 
        this.currentUser.set(null);
        //сбрасывем сигнал баланса в 0 
        this.currentBalance.set(0);

        
        this.currentUserId.set(null);

        //сброс сигнала бп 
        this.currentBpBalance.set(0);
    }

    //вспомогательный метод для чтения токена другиими сервисами
    getToken(): string | null {
        //возвращаем строку токена или null если не авторизован 
        return localStorage.getItem('token');
    }


    //сигнал userId (чтоб потом тыкать на профайлы через ленту)
    currentUserId = signal<number | null>(
        localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null
    );

    //приватный метод сохранени данных из сессии
    private setSession(authResult: AuthResponseDto): void {
        console.log("JWT:", authResult.token); // ← смотри токен
        //записываем полученный JWT ТОКЕН ИЗ localStorage
        localStorage.setItem('token', authResult.token);

        //записываем имя пользователя в localstorage
        localStorage.setItem('username', authResult.username);
        //обновляем сигнал имени (интерфейс перерисует имя в шапке)
        this.currentUser.set(authResult.username);

         //записываем баланс в виде строки в localstorage
        localStorage.setItem('balance',authResult.balance.toString());
        //обновляем сигнал баланса ( интерфейс перерисует в сумму)
        this.currentBalance.set(authResult.balance);

        //сохраняем userId (если пришел)
        if(authResult.userId) {
            localStorage.setItem('userId', authResult.userId.toString());
            this.currentUserId.set(authResult.userId);
        }

        //записывает bp баланс если он пришел от dto бекенда
        if(authResult.battlePassBalance !== undefined) {
            this.updateBpBalance(authResult.battlePassBalance);
        }

    }


    //пметод пополнения баланса 
    topUpBalance(amount: number): Observable<{message: string; newBalance: number}> {
        const token = this.getToken(); // достаем JWT токен из localStorega
        
        //формируем  заголовок в  Authorization
        const headers = {Authorization: `Bearer ${token}` };

        //отправка POST запрос на /api/auth/top up
        return this.http.post<{message: string; newBalance: number}> (
            `${this.apiUrl}/top-up`,
            {amount}, //тело запроса
            {headers} //заголовки
        ).pipe(
            tap(res => {
                //обновляем сигналы баланса на фронте
                this.currentBalance.set(res.newBalance);
                //сохраняем нью баланс в localStorage
                localStorage.setItem('balance', res.newBalance.toString());
            })
        );
    }



    //создание кода сброса пароля и отправка на почту 
    //email почта юзерка который забыл пароль
    forgotPassword(email: string): Observable<{message: string}> {
        //post запрос по адресу `${this.apiUrl}/forgot-password` передавая объект email
        return this.http.post<{message: string}>(`${this.apiUrl}/forgot-password`, {email});
    }

    //post запрос с нью паролем, кодом подтверджения и почта для сохранения в бд 
    //dto объект с полями email, code, newPassword
    resetPassword(dto: {email: string, code: string, newPassword: string}): Observable<{message: string}> {
        return this.http.post<{message: string}>(`${this.apiUrl}/reset-password`, dto);
    }


}
