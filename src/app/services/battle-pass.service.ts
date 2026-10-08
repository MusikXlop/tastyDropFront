//для того чтоб сделать класс и внедрять в другие компоненты
import { Injectable } from '@angular/core';

// GET POST PUT DELETE
import { HttpClient } from '@angular/common/http';

//RxJS который представляет данные которые придут асинхронно от бекенд
import { Observable } from 'rxjs';


export interface BattlePassLevel
 {
  levelId: number;
  levelNumber: number;    
  questName: string;     
   goalType: string;            
  goalValue: number;
  currentProgress: number;
  isCompleted: boolean;
  isRewardClaimed: boolean;
  rewardText: string | null;
  rewardCurrency: number | null;
  rewardCaseId: number | null;
}



//ответ серверного api при клике забрать награду 
export interface ClaimRewardResponse {
  success: boolean;
  message: string;
  rewardCurrency?: number;
  rewardCaseId?: number;
  rewardType?: string;
  battlePassBalance?: number; 
  mainBalance?: number;
}

@Injectable({ providedIn: 'root' }) // 'root' создаёт синглтон сервиса для всего приложения
export class BattlePassService {
    
    private apiUrl = 'https://localhost:7141/api/BattlePass';

    constructor(private http: HttpClient) {}

    //получение списка всех лвлов с уровнем прогресса автоизованного юзера
    getBattlePass(): Observable<BattlePassLevel[]> {
        return this.http.get<BattlePassLevel[]>(this.apiUrl);
    }

    //запрос на получение награды
    claimReward(levelId: number): Observable<ClaimRewardResponse>{
        return this.http.post<ClaimRewardResponse>(`${this.apiUrl}/claim/${levelId}`,{});
    }

    /*запрос на получение лвла батл пасса в профиле 
    если передаем userId то показывает лвл батл пасса чужого юзера
    если не передаем то МЫ 
    */
    getCurrentLevel(userId?: number): Observable<{currentLevel: number}>
    {
        const url = userId
        ? `${this.apiUrl}/current-level?userId=${userId}` 
        : `${this.apiUrl}/current-level`;
        return this.http.get<{ currentLevel: number }>(url);
    }


} 