import { Component, ChangeDetectorRef, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { WheelColorOption, WheelResultDto } from '../../core/models/wheel.model';
import { WheelService } from '../../core/services/wheel.service';

@Component({
  selector: 'app-wheel',
  standalone: true,      // компонент без модуля
  imports: [CommonModule,FormsModule],
  templateUrl: './wheel.html',
  styleUrls: ['./wheel.scss'],
})
export class WheelComponent implements OnInit, OnDestroy {
  //ставка по умолчинию
  betAmount: number = 1.0;
  //выбранный цвет
  selectedColor: string = 'Brown';
  //флаг для прокрута колеса
  isSpinning: boolean = false;

  // сообщение об ошибке
  errorMessage: string | null = null; 
  lastResult: WheelResultDto | null = null; // результат последнего спина

  wheelRotation: number = 0; // угол вращения колеса

   // список доступных цветов для UI
  colorOptions: WheelColorOption[] = [
    { key: 'Brown',    label: 'Bronze x2',    multiplier: 2,  colorHex: '#8B4513', iconUrl: 'assets/wheel/hero_badge_rank_0_png.avif' },
    { key: 'Silver',   label: 'Silver x5',   multiplier: 5,  colorHex: '#C0C0C0', iconUrl: 'assets/wheel/hero_badge_rank_1_png.avif' },
    { key: 'Gold',     label: 'Gold x10',    multiplier: 10, colorHex: '#FFD700', iconUrl: 'assets/wheel/hero_badge_rank_2_png.avif' },
    { key: 'Blue',     label: 'Platinum x25',    multiplier: 25, colorHex: '#007EFF', iconUrl: 'assets/wheel/hero_badge_rank_3_png.avif' },
    { key: 'Purple',   label: 'Master x50',  multiplier: 50, colorHex: '#A020F0', iconUrl: 'assets/wheel/hero_badge_rank_4_png.avif' },
    { key: 'Immortal', label: 'Grandmaster x75',multiplier: 75, colorHex: '#E24C00', iconUrl: 'assets/wheel/hero_badge_rank_5_png.avif' },
  ];

  // Вспомогательный метод для получения иконки сектора
  getSegmentIcon(segKey: string): string | undefined {
    return this.colorOptions.find(opt => opt.key.toLowerCase() === segKey.toLowerCase())?.iconUrl;
  }

  // Вспомогательный метод для получения label: 'Bronze x2'
  getColorLabel(colorKey: string): string {
    return this.colorOptions.find(opt => opt.key.toLowerCase() === colorKey.toLowerCase())?.label ?? colorKey;
  }


  // порядок сегментов на колесе (20 секторов)
  segments = [
    'Immortal', 'Brown', 'Silver', 'Brown', 'Gold',
    'Brown',    'Silver','Brown',  'Purple','Brown',
    'Silver',   'Brown', 'Blue',   'Brown', 'Silver',
    'Brown',    'Gold',  'Brown',  'Silver','Brown'
  ];


  constructor(
    private wheelService: WheelService,
    public authService: AuthService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ){}
  

  ngOnInit(): void {
    this.renderer.addClass(document.body, 'wheel-theme');
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'wheel-theme');
  }


  //выбор цвета 
  selectColor(colorKey: string): void{
    if(this.isSpinning) return; //если колесо крутится то не меняем(остьавайся)
    this.selectedColor = colorKey;
  }

  // проверка корректности ввода
  validateInputs(): string | null {
    const bet = Number(this.betAmount) || 0;
    const balance = Number(this.authService.currentBalance()) || 0;

    if (bet <= 0) {
      return 'Ставка должна быть больше 0!';
    }
    if (bet > balance) {
      return 'У ТЕБЯ ДЕНЕГ НЕТ ТЫ БИМЖ';
    }
    if (!this.selectedColor) {
      return 'Выбери цвет для ставки!';
    }

    return null;
  }

  //спин лест гоу
  spin(): void {
    this.errorMessage = null;
    const error = this.validateInputs();

    if(error) {
      this.errorMessage = error;
      return;
    }

    this.isSpinning = true;

    this.wheelService.spin(this.betAmount, this.selectedColor).subscribe({
      next: (res) => {
        if(res.newBalance !== undefined){
          this.authService.updateBalance(res.newBalance);//обнова баланса
        }
        this.animateWheelToColor(res.wonColor, ()=> {
          this.lastResult = res; // сохраняем результат
          this.isSpinning = false;
          this.cdr.detectChanges(); 
        });
      },
      error: (err) => {
        console.error('Ошибка вращения колеса:', err);
        this.errorMessage = err?.error?.message || 'Ошибка сервера при закрутке колеса.';
        this.isSpinning = false;
        this.cdr.detectChanges();
      }
    });

  }

  //анимация колеса
  private animateWheelToColor(wonColor: string, onComplete: () => void): void {
    const matchingIndices: number[] = []; // список индексов 
    this.segments.forEach((color, idx) => {
      if(color.toLowerCase() === wonColor.toLowerCase()) {
        matchingIndices.push(idx); // добавляем идекс совпадающего цвета
      }
    });

    //выбираем случайный идекс из совпадающих
    const targetSegmentIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
    //угол одного сектора 
    const segmentAngle = 360 / this.segments.length;
    //угол нужного сектора
    const targetAngle = targetSegmentIndex * segmentAngle;
    //минимум 5 полных оборотов
    const extraRounds = 360 * 5;
    //базовый угол
    const currentBase = Math.ceil(this.wheelRotation / 360) * 360;
    
    //новый угол вращения
    this.wheelRotation = currentBase + extraRounds + (360 - targetAngle);

    this.cdr.detectChanges();


    setTimeout(() => {
      onComplete(); 
    }, 4000); // 4 сек прокрута
  }

  // запрет ввода символов e/E/+/- в поле ставки
  preventInvalidBetChars(event: KeyboardEvent): void {
    if (['e','E','+','-'].includes(event.key)) event.preventDefault();
  }

  // запрет вставки нечисловых данных
  onPasteBet(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';
    if (isNaN(parseFloat(pasteData))) event.preventDefault();
  }

  // очистка лишних нулей и парсинг ставки
  sanitizeBet(event: Event): void {
    const target = event.target as HTMLInputElement;
    let raw = target.value;
    if (/^0[0-9]/.test(raw)) raw = raw.replace(/^0+/, ''); // убираем ведущие нули
    target.value = raw;
    const parsed = parseFloat(raw); // преобразуем в число
    this.betAmount = isNaN(parsed) ? 0 : parsed; // если NaN → ставим 0
    this.errorMessage = null; // очищаем ошибки
  }
}
