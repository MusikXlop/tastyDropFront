//В TypeScript принято описывать "форму" (интерфейсы) объектов.
//  Это включает строгое автодополнение в редакторе и предохраняет от опечаток в названии полей.


//DTO для отправки данных при регистрации 
export interface RegisterDto {
    //поле для логина 
    username: string;
    //email
    email: string;
    //password
    password: string;

}

//dto для подтверждения email кодом из письма
export interface ConfirmEmailDto {
    email: string;
    code: string;

}


//dto ответа бэкэнда при вызове /api/auth/register
export interface RegisterResponseDto {
    message: string;
    email: string;
}

//ИНТЕРФЕЙС объекта котоырй отправлется при входе
export interface LoginDto {
    //поле для логина/email
    email: string;
    //точно название свойства() пароль
    password: string;


}

//интерфейс ответ от сервера при успешной авторизации
export interface AuthResponseDto{
    //выданный сервером jwt токен для доступа к защищенным эндпоинтам 
    token:string; 
    //имя пользователя для отображения в шапке
    username: string;
    //текущий банас
    balance: number;

    userId: number;

    //батлпасс баланс 
    battlePassBalance?: number;
}