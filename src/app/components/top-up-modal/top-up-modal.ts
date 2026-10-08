import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common'; //ngIf 
import { FormsModule } from '@angular/forms'; //banana

import { AuthService } from '../../core/services/auth';


@Component({
  selector: 'app-top-up-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-up-modal.html',
  styleUrl: './top-up-modal.scss',
})
export class TopUpModalComponent {
  //создаем событие close чтоб родитель(будет мб header) мог закрыть модельку
  @Output() close = new EventEmitter<void>();

  amount: number = 20; //по умолчанию
  minAmount: number = 0;
  maxAmount: number = 2000;
  step: number = 10;

  isLoading: boolean = false;
  errorMessage: string = '';

  //пресеты для выбора 
  presets: number[] = [50,  250, 500, 1000, 2000];


  //внедряем сервис авторизации и 
  constructor(
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  //мето для выбора суммы из пресета
  setPreset(val: number): void {
    this.amount = val;
    this.cd.markForCheck();
  }


  //вызывается при движении ползунка мышкой
  onAmountChange(val: number): void {
    this.amount = Number(val);
    this.cd.markForCheck(); // Принудительно перерисовываем цифры прямо во время тяги ползунка
  }

  //метод пополнения  баланса
  onTopUp(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cd.markForCheck();
    //успех (закрываем )
    this.authService.topUpBalance(this.amount).subscribe({
      next:() => {
          this.isLoading = false;
          this.close.emit(); //закрываем модалку(шляпу для пополнения)
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Ошибка пополнения баланса (ты виновен в этом)';
        this.cd.markForCheck();

      }
    });
  }
  //метод закрытия модалки вручнуую
  onClose(): void{
    this.close.emit();
  }
}
