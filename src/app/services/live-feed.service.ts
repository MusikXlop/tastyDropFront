import { Injectable, signal } from '@angular/core'

import * as signalR from '@microsoft/signalr';

import { HttpClient } from '@angular/common/http';

//интерфейс описывающий структуру 
export interface LiveDrop {
    dropId: number; //id дропа
    username: string; //имя пользователя
    userId: number; //id пользователя(для перехода на профиль)
    itemName: string; //название предмета
    itemImage: string; //ссылка на картинку предмета
    itemRarity: string; //редкость предмета
    caseId: number; //id кейса (для перехода на кейс)
    caseName: string; //название кейса
    caseImage: string; //ссылка на картинку кейса
    dropTime: string; //время дропа (строка)
    
}

@Injectable({ providedIn: 'root' })
export class LiveFeedService {
    private hubConnection!: signalR.HubConnection; //объект подключения к SignalR хабу

    public drops = signal<LiveDrop[]>([]); //сигнал для хранения ласт дропов

    private apiUrl = 'https://localhost:7141';
    private hubUrl = `https://localhost:7141/liveDropHub`;

    constructor(private http: HttpClient) {
        this.loadInitialDrops(); //загрузка последних дропов при старте
        this.startSignalRConnection(); //подключение к WebSocket
    }

    //первоначальня загрузка ласт дропов через REST 
    private loadInitialDrops(): void {
        this.http.get<LiveDrop[]>(`${this.apiUrl}/api/cases/recent-drops`).subscribe({
            next: (data) => {
                console.log('=== INITIAL LIVE DROPS ===');
                console.log('DATA:', data);
                console.log('COUNT:', data?.length);
                //если пришел массив то сохраняем его  сигнал
                if (Array.isArray(data)) {
                    this.drops.set(data);

                    console.log(
                        'SIGNAL AFTER SET:',
                        this.drops()
                    );
                }
            },
            error: (err) => console.error('Ошибка загрузки ленты дропов:', err)
        });
    }

    //подключем  к SignalR Hub
    private startSignalRConnection(): void {
        this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl) //адресс хаба
        .withAutomaticReconnect()
        .build();

        
        // слушаем событие "ReceiveDrop" от бека
        this.hubConnection.on('ReceiveDrop', (newDrop: LiveDrop) => {

            console.log('🔥 RECEIVE DROP FROM SIGNALR:');
            console.log('NEW DROP:', newDrop);

            this.drops.update(prevDrops => {

                const updated = [newDrop, ...prevDrops.slice(0, 24)];

                console.log('🔥 FEED AFTER UPDATE:');
                console.log('COUNT:', updated.length);
                console.log('FIRST DROP:', updated[0]);
                console.log('ALL DROPS:', updated);

                return updated;
            });

        });

        this.hubConnection.start()
        .then(() => console.log('Подключение к SignalR Hub установлено.'))
        .catch((err) => console.error('Ошибка подключения к SignalR Hub:', err));

        
    }
}