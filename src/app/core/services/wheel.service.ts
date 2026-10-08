import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WheelSpinDto, WheelResultDto } from '../models/wheel.model';
@Injectable({
    providedIn: 'root' //сервис доступен везде 
})
export class WheelService   {
    private apiUrl = 'https://localhost:7141/api/wheel'; // адрес API

    constructor(private http: HttpClient){}

    //метл спина отправляет post запрос на сервер
    spin(betAmount: number, targetColor: string): Observable<WheelResultDto>{
        const dto: WheelSpinDto = { betAmount, targetColor}; //формируем dto
        //отправка запроса 
        return this.http.post<WheelResultDto>(`${this.apiUrl}/spin`, dto);
    }

}
