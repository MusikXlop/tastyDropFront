import {  Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import { CrashStartDto, CrashCashoutDto, CrashGameStatusDto } from '../models/crash.model';
import * as signalR from '@microsoft/signalr';


@Injectable({
    providedIn: 'root' //сервис доступен по всем
})

export class CrashService {
    private apiUrl = 'https://localhost:7141/api/crash';

    private hubUrl = 'https://localhost:7141/hubs/crash';
    //для signalR хаба


    //объект соеденения SignalR 
    private hubConnection!: signalR.HubConnection;


    //поток чеслень(множитель) каждое ньб зач прилетает из signalR
    public onTick = new Subject<number>();

    //поток объектов когда краш
    public onCrash = new Subject<{gameId: number; crashPoint: number}>();

    //ПОТОК обїекто когда старт гейма 
    public onGameStarted = new Subject<{ gameId: number; betAmount: number; newBalance: number }>();

    //потом строк когда ошибка
    public onError = new Subject<string>();


    constructor(private http: HttpClient) {}


    //запуск соеденения  signalR  (асинхронный запуск)
    public async startSignalRConnection(): Promise<void>
    {
        //СОЗДАЕМ объект только если его еще нет 
        if (!this.hubConnection) 
        {
            this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                //передача токеена авторизации дл SignalR
                // Динамически считываем актуальный токен из storage при любом подключении/реконнекте
                accessTokenFactory: () => localStorage.getItem('token') || '' //достаем токен
            }) //подключаемся к хату с  токеном авторизации
             //вкл автоперподключение (сразу 2 5 10 сек )
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .build();//билдим объект соедененния(завершение)


            

            //чтоб наши ui обновлялись в реал времени без ручных запросов
            //слушаем событие от OnTick от сервера и пробрасываем его в Subject   
            this.hubConnection.on('OnTick',(multiplier: number) =>{
                console.log('[SignalR LOG] OnTick received:', multiplier); // ЛОГ ТИКОВ    
                //текущий множитель от сервера
                this.onTick.next(multiplier);
            });
            //слушаем событие от OnCrash  и пробрасываем его в Subject   
            this.hubConnection.on('OnCrash',(data)=>{
                console.log('[SignalR LOG] OnCrash received:', data);
                this.onCrash.next(data);
            });

            //слушаем событие от OnGameStarted  и пробрасываем его в Subject   
            this.hubConnection.on('OnGameStarted', (data) => {
                console.log('[SignalR LOG] OnGameStarted received:', data);
                this.onGameStarted.next(data);
            });


            //слушаем событие от onError  и пробрасываем его в Subject   
            this.hubConnection.on('OnError', (message: string) => {
                console.error('[SignalR LOG] OnError received:', message);
                this.onError.next(message);
            });
        }

        // запускаем соединение ( если подключили уже то скип)
        // проверка подключение к siganlR  если подклбючено 
        if(this.hubConnection.state === signalR.HubConnectionState.Connected ||
            //если подключается прям ща 
            this.hubConnection.state === signalR.HubConnectionState.Connecting) {
           
            return; //  ничо не длелаем просто скип
        }
            
        try {
            //ожидаем пока соеденения установися (signalR)
            await this.hubConnection.start();

            //если успешно то лог
            console.log('[SignalR LOG] Connection successfully established!');

        } catch (err) {
            console.error('[SignalR LOG] Connection Error: ', err);
        }
    }



    //остановка signalR
    public stopSignalRConnection(): void {
        if (this.hubConnection){
            this.hubConnection.stop();
        }
    }

    //принимает сумму ставки
    //вызов startgame через signalR (автомат подклюбчение при разрыве)
    public async startGameViaHub(betAmount: number): Promise<void> 
    {

        //проверка подключен ли  хаб(hubConnection) 
        // он в состоянии Connected 
        if (
            !this.hubConnection ||
            this.hubConnection.state !== signalR.HubConnectionState.Connected
        ) {

        
            console.error('[SignalR LOG] Hub is disconnected. Reconnecting before start...');


            //попытка подключения signalR соеденение
            //ждем пка завершаться подключения
            await this.startSignalRConnection(); 
        }


        //после попытки подключения проверка есть ли hubConnection и рыля ли он подключен
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) 
            {
             //если есть то обрабатываем ошибка   
            try {
                    console.log('[SignalR LOG] Invoking StartGame with bet:', betAmount);
                   
                    //вызов метода StartGame на сервере  
                    //передаем ставку
                    await this.hubConnection.invoke('StartGame', betAmount);
            } catch (err) {
                //ош8бка не удается вызвыать 
                    console.error('[SignalR LOG] StartGame Invoke Error:', err);
                }

            } else {
                //попытка подклоючится но не подключился
                console.error('[SignalR LOG] Cannot start game: Hub state is', this.hubConnection?.state);
            }
        }

        //post на вывод денег 
        cashout(gameId: number, targetMultiplier: number): Observable<CrashGameStatusDto> {
        return this.http.post<CrashGameStatusDto>(`${this.apiUrl}/cashout`, {
        gameId,
        targetMultiplier
        } as CrashCashoutDto);
    }

    //get запрос на активную игру
    getActiveGame(): Observable<CrashGameStatusDto | null> 
    {
        return this.http.get<CrashGameStatusDto | null>(`${this.apiUrl}/active`);
    }
}
