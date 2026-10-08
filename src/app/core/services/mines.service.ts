import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StartMinesResponse, RevealCellResponse, MinesGameStatusDto } from '../models/mines.model';


@Injectable({
    providedIn: 'root' //сервис доступен по всем прилоржении
})
export class MinesService {
    //базовый юрл
    private apiUrl = 'https://localhost:7141/api/mines';

    // внедрение HttpClient для запросов
    constructor(private http: HttpClient){} 

    //post на старт игры
    startGame(betAmount: number, minesCount: number, gridSize: number): Observable<StartMinesResponse>{
        return this.http.post<StartMinesResponse>(`${this.apiUrl}/start`,{betAmount, minesCount, gridSize});
    }

    // post на открытие клетки 
    revealCell(gameId: number, cellIndex: number): Observable<RevealCellResponse>{
        return this.http.post<RevealCellResponse>(`${this.apiUrl}/reveal`, {gameId, cellIndex});
    }

    //post на вин деньги
    cashout(gameId: number): Observable<{ winAmount: number; newBalance?: number; minePositions?: number[] }> {
    return this.http.post<{ winAmount: number; newBalance?: number; minePositions?: number[] }>(
        `${this.apiUrl}/cashout`, 
        { gameId }
    );
}

    //post на актвивную игру
    getActiveGame(): Observable<MinesGameStatusDto | null> {
        return this.http.get<MinesGameStatusDto | null>(`${this.apiUrl}/active`);
    }
}
