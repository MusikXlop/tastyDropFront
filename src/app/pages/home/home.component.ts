import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common'; // 
import { RouterModule } from '@angular/router'
import { CaseService, CaseModel, FreeCaseStatus } from '../../services/case';

@Component({
  selector: 'app-home',
  standalone: true, 
  imports: [CommonModule,RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

// определяем компонент HomeComponent 
export class HomeComponent implements OnInit{
  cases: CaseModel[] = [];
 
  // Словарь для хранения статуса доступности фри-кейса по caseId
  freeStatuses: { [caseId: number]: boolean } = {};

  //внедряем  CaseService
  constructor(private caseService: CaseService,
              private cdr: ChangeDetectorRef
  ){}


  //при инициализации компонента ngOnInit вызывааем getCases
  //если успех то сохраняем кейсв в массив cases если нет то ошибка
  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.caseService.getCases().subscribe({
      next: (data) => {
        console.log('Полученные кейсы:', data);
        this.cases = data;
        
        // После загрузки кейсов проверяем бесплатный статус для каждого
        this.checkFreeStatuses();
        //  Принудительно сообщаем Angular что данные изменились и нужно обновить View
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Ошибка загрузки кейсов:', err)
    });
  }

  // После загрузки кейсов проверяем бесплатный статус для каждого
  checkFreeStatuses(): void {
    this.cases.forEach(c => {
      this.caseService.checkFreeStatus(c.caseId).subscribe({
        next: (res: FreeCaseStatus) => {
          this.freeStatuses[c.caseId] = res.isFreeAvailable;
          this.cdr.detectChanges();
        },
        error: () => {
          this.freeStatuses[c.caseId] = false;
        }
      });
    });
  }


  isFree(caseId: number): boolean {
    // Преобразуем в boolean сохраняя true как tru
    return !!this.freeStatuses[caseId];
  }

  //метод для отбора кейсов по их айди(В СПИСОК де они будут)
  getCasesByIds(ids: number[]): CaseModel[] {
    return this.cases.filter(c => ids.includes(c.caseId));
  }

  onImgError(event: Event) {
    console.error('Не удалось загрузить картинку по пути:', (event.target as HTMLImageElement).src);
  }
}
