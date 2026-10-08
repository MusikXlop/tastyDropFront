// делает класс сервисом, который можно
//  внедрять в другие компоненты.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
//тип из RxJS, который возвращает 
// асинхронные данные (ответы от API).
import { Observable } from 'rxjs';





//ответ  о наличии фри кейса
export interface FreeCaseStatus {
    isFreeAvailable: boolean;
    reason?: string;
}

//предмет внутри кейса 
export interface CaseItem {
    itemId: number;
    name: string;
    imageUrl: string;
    price: number;
    rarity: string;
    dropWeight?: number;
}


//интерфейсы под наш dto(для передачи данных)
//структура данных для скина
export interface InventoryItem  {
    inventoryId: number; // всегда есть уникальный
    itemId: number;
    name: string;
    imageUrl: string;
    price: number;
    rarity: string;
    droppedAt?: string;   //  шанс выпадения
}




//ответ при прдаже 
export interface SellResponse {
    success: boolean;
    newBalance: number;
}

//ответ при выводе 
export interface WithdrawResponse {
    message: string;
}

//структура данных для кейса
export interface CaseModel {
    caseId: number;
    name: string;
    price: number;
    imageUrl: string;
    currency?: 'USD' | 'BP'; // Валюта кейса
}
//результат открытия кейса 
export interface OpenCaseResult {
success: boolean;
  wonItemDto: InventoryItem[];
  newBalance: number;
  newBattlePassBalance?: number; // Новый баланс BP от бэка
  isFreeOpen?: boolean;
}


// интерфейс, описывающий предмет,
// который сервер вернёт после успешного апгрейда
export interface WonItemDto {
    dropId: number;       // ID записи в LiveDrops
    inventoryId: number;  // ID нового предмета в UserInventory
    itemId: number;       // ID предмета из Items
    name: string;         // Название предмета
    imageUrl: string;     // Путь к картинке
    price: number;        // Цена предмета
    rarity: string;       // Редкость предмета
}


//бест оф за бест лроп
export interface BestDrop {
    itemId: number;
    name: string;
    imageUrl: string;
    price: number;
    rarity: string;
    droppedAt: string;
}


// интерфейс, описывающий ответ бэкенда после выполнения апгрейда
export interface UpgradeResultDto {
    isSuccess: boolean;          // Успех апгрейда или проигрыш
    rollValue: number;           // Случайное число от 0 до 100
    winChance: number;            // Шанс победы
    wonItem: WonItemDto | null;   // Полученный предмет или null при проигрыше
}


@Injectable({
  providedIn: 'root' //создаем один экземпляр сервиса на все приложения
})
export class CaseService {
    //адрес бека 
    private apiUrl = 'https://localhost:7141/api';

    //внедряем HttpClient чтоб можно было делать запросы 
    constructor(private http: HttpClient) {}

    //получаем список всех кейсов
    //возвращаем массив обектов CaseModel
    getCases(): Observable<CaseModel[]> {
        return this.http.get<CaseModel[]>(`${this.apiUrl}/cases`)
    } 
    

    //получаем список предметов внутри конкретного кейса
    //
    getCaseItems(caseId: number): Observable<CaseItem[]>{
        return this.http.get<CaseItem[]>(`${this.apiUrl}/cases/${caseId}/items`);
    }


    //фри статс для кейса
    checkFreeStatus(caseId: number):Observable<FreeCaseStatus> {
        return this.http.get<FreeCaseStatus>(`${this.apiUrl}/cases/${caseId}/free-status`);
    }


    /*openCase отправляем POS запрос на сервер шоб открыть кейс
     Передает userId  caseId и возвращаем результат OpenCaseResult*/
    openCase(caseId: number, amount: number = 1 ): Observable<OpenCaseResult> {
        return this.http.post<OpenCaseResult>(`${this.apiUrl}/case/open`, {
            caseId,
            amount
        });
    }

    //для запроса ника
    getUsernameById(userId: number): Observable<{ username: string}>{
        return this.http.get<{ username: string }>(`${this.apiUrl}/user/${userId}/username`);   
    }

    //получить инвентарь текущего юзера(сли userId передан чужой если нет текущего юзера)
    getInventory(userId?: number): Observable<InventoryItem[]> {
        // если юзерid передали то в юзера а если нет то в свой  
        const url = userId 
        ?  `${this.apiUrl}/user/inventory/${userId}`
        : `${this.apiUrl}/user/inventory`

        return this.http.get<InventoryItem[]>(url);
    }

    //мтод для продажи предмета из инвентаря
    sellItem(inventoryId?: number, itemId?: number): Observable<SellResponse> {
        return this.http.post<SellResponse>(`${this.apiUrl}/inventory/sell`,{
            inventoryId,
            itemId
        });
    }

    //метод получения бест  оф зе бест дропа
    getBestDrop(userId?: number): Observable<BestDrop | null> {
        const url = userId 
        ? `${this.apiUrl}/user/${userId}/best-drop` 
        : `${this.apiUrl}/user/best-drop`; 

        return this.http.get<BestDrop | null>(url);
    }


    //вывод предмета 
    withdrawItem(inventoryId?: number): Observable<WithdrawResponse> {
        return this.http.post<WithdrawResponse>(`${this.apiUrl}/inventory/withdraw`, {
            inventoryId
        });
    }

}
