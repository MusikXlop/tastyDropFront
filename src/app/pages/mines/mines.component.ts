import { Component, OnInit, OnDestroy, Renderer2,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MinesService } from '../../core/services/mines.service';
import { AuthService } from '../../core/services/auth';
import { MinesCell } from '../../core/models/mines.model';


@Component({
  selector: 'app-mines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mines.component.html',
  styleUrls: ['./mines.component.scss'],
})
export class MinesComponent implements OnInit {
  winImg = 'assets/mine/win2.avif';
  minaImg = 'assets/mine/lose2.avif';

  gridSize: number = 5; // размер поля по умолчанию
  minesCount: number = 5; // колво мин по умолчанию
  betAmount: number = 1.0; //ставка по умолчанию

  //доступные размеры поля
   availableSizes: number[] = [3, 4, 5, 6];

  // айди текущей игрпы
  gameId: number | null = null;

  //идет ли она 
  isPlaying: boolean = false;

  isGameOver: boolean = false;

  //вин ли игрок
  isWin: boolean = false;
 

  //текущий множитель
  currentMultiplier: number = 1.0;
  //текущий вин
  currentWin: number = 0;
  //массив клеток
  cells: MinesCell[] = [];

  //ошибка если нема денег или много мин 
  errorMessage: string | null = null;

  constructor(
    private minesService: MinesService, 
    public authService: AuthService,
    private cd: ChangeDetectorRef,
    private renderer: Renderer2
  ){}

  ngOnInit(): void {
    this.initGrid();
    this.loadActiveGame();

    // Вешаем класс для Mines на body
    this.renderer.addClass(document.body, 'mines-theme');
  }
  
  ngOnDestroy(): void {
    // Убираем класс при выходе из компонента
    this.renderer.removeClass(document.body, 'mines-theme');
  }

  
  //всего клеток на поле 
  get totalCells(): number {
    return this.gridSize * this.gridSize;
  }

  //макс мин 
  //-1 чтоб хотя бы одна свободная клетька была 
  get maxMines(): number {
    return this.totalCells - 1; // 0 до ... (-1)
  }



  //для ошибок 
  // Метод валидации с приведением типов (Number) и обработкой null/undefined
  validateInputs(): string | null {
    const bet = Number(this.betAmount) || 0;
    const mines = Number(this.minesCount) || 0;
    const balance = Number(this.authService.currentBalance()) || 0;

    if (bet === 0) {
      return 'ТЫ ЧО РЕШИЛ ПОСТАВИТЬ НУЛЬ? ПРОЧИТАНА ШЛЯПА';
    }
    if (bet < 0) {
      return 'И как мне это пониматЬ?';
    }
    if (bet > balance) {
      return 'У ТЕБЯ ДЕНЕГ НЕТ ТЫ БИМЖ';
    }
    if (mines > this.maxMines) {
      return `ТЫ ЧО В СЕБЯ ПОВЕРИЛ? У тебя даже сверху написано макс мины (дублирую для тебя) ВОТ СТОКА МАКСИМУМ ${this.maxMines}`;
    }
    if (mines < 1) {
      return 'Ненене так не сработает у тебя минималка мин 1';
    }

    return null;
  }

  // Запрет ввода ненужных символов для МИН (только целые положительные)
preventInvalidMinesChars(event: KeyboardEvent): void {
  if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
}

// Запрет ввода ненужных символов для СТАВКИ (разрешаем точку/запятую для дробей)
preventInvalidBetChars(event: KeyboardEvent): void {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
}

// Запрет вставки дробей в мины
onPasteMines(event: ClipboardEvent): void {
  const pasteData = event.clipboardData?.getData('text') || '';
  if (!/^\d+$/.test(pasteData)) {
    event.preventDefault();
  }
}

// Запрет вставки букв/знаков в ставку
onPasteBet(event: ClipboardEvent): void {
  const pasteData = event.clipboardData?.getData('text') || '';
  if (isNaN(parseFloat(pasteData))) {
    event.preventDefault();
  }
}

// Очистка ведущих нулей для СТАВКИ
sanitizeBet(event: Event): void {
  const target = event.target as HTMLInputElement;
  let raw = target.value;

  // Если ввели "01", "005" и т.д. (но не "0.5")
  if (/^0[0-9]/.test(raw)) {
    raw = raw.replace(/^0+/, '');
    target.value = raw; // Перезаписываем DOM
  }

  const parsed = parseFloat(raw);
  this.betAmount = isNaN(parsed) ? 0 : parsed;
  
  // Обновляем ошибку
  this.clearError();
}

// Очистка ведущих нулей для КОЛИЧЕСТВА МИН
sanitizeMines(event: Event): void {
  const target = event.target as HTMLInputElement;
  let raw = target.value;

  // Убираем ведущие нули и любые точки/запятые, если они проскочили
  raw = raw.replace(/^0+(?=\d)/, '').replace(/[.,]/g, '');

  if (raw !== target.value) {
    target.value = raw; // Перезаписываем DOM напрямую
  }

  const parsed = parseInt(raw, 10);
  this.minesCount = isNaN(parsed) ? (null as any) : parsed;

  this.clearError();
}

  // Смена размера поля
  selectSize(size: number): void {
    // Не позволяем менять размер, пока идет активная игра
    if (this.isPlaying) return;

    this.gridSize = size;
    this.onSizeChange();
  }



  onSizeChange(): void {
    //проверка Корректируем minesCount только если оно превышает максимум для ТЕКУЩЕЙ сетки
    if(this.minesCount > this.maxMines) {
      this.minesCount = this.maxMines;
    } else if (this.minesCount < 1){
      this.minesCount = 1;
    }


    //пересоздаем сетку
    this.initGrid();
  }


  //для чека активной игры
  loadActiveGame(): void {
      this.minesService.getActiveGame().subscribe({
          next: (game) => {

            // если активной игры нет
            if (!game) {
                return;
            }

            // восстанавливаем игру
            this.gameId = game.gameId;
            this.betAmount = game.betAmount;
            this.minesCount = game.minesCount;

            // Восстанавливаем GridSize из ответа бэкенда
            if (game.gridSize) {
              this.gridSize = game.gridSize;
            }


            this.currentMultiplier = game.currentMultiplier;
            this.currentWin = this.betAmount * this.currentMultiplier;

            this.isPlaying = true;
            this.isGameOver = false;
            this.isWin = false;

            // создаём поле
            this.initGrid();

            // отмечаем уже открытые клетки
            if (game.revealedCells && game.revealedCells.length > 0) {
              const revealedSet = new Set(game.revealedCells);
              this.cells = this.cells.map(cell => ({
                ...cell,
                isRevealed: revealedSet.has(cell.index)
              }));
            }
            this.cd.detectChanges();
        },

        error: (err) => {
            console.error('Ошибка получения активной игры:', err);
        }
    });
  }


  initGrid(): void{
    //создаем массив клеток (все закрытые без мин)
    /*
    создаем массив заданной длинны 
    this.totalCells колво клеток на поле (25 для 5х5)
    создаем массив на 25 элементов

    (_, i) => ({ ... })  коллбек функция которая вызывается дл каждого элемента массива
    i = index элемента 0 1 2... до  totalCells -1 
    */
    this.cells = Array.from({length: this.totalCells}, (_, i) => ({
      index: i, //номер клетки
      isRevealed: false, //клетка закрыта 
      isMine: false //пока мин нема(сервак назначит)
    }));
  }

  // Очистка ошибки при редактировании инпутов
  clearError(): void {
    this.errorMessage = null;
  }

  startGame(): void {
    // Сбрасываем старую ошибку
    this.errorMessage = null;

    // Валидируем данные в момент клика
    const error = this.validateInputs();
    if (error) {
      this.errorMessage = error;
      this.cd.detectChanges();
      return; // Не запускаем игру
    }
    //запрос на старт игры 
    this.minesService.startGame(this.betAmount, this.minesCount, this.gridSize).subscribe({
      next:(res) => {
        //сорать айди игры
        this.gameId = res.gameId; 
        this.isPlaying = true;
        this.isGameOver = false;
        this.isWin = false;
        //множитель
        this.currentMultiplier = res.currentMultiplier;
        
        //текущий вин
        this.currentWin = this.betAmount * this.currentMultiplier;

        // Обновляем баланс в UI и localStorage
        if (res.newBalance !== undefined) {
          this.authService.updateBalance(res.newBalance);
        }


        this.initGrid(); //сброс поля
        this.cd.detectChanges();
      },
      error: (err) => {
          console.error('Ошибка старта игры:', err);
          // Если бэкенд вернул 400 с текстом ошибки
          this.errorMessage = err?.error?.message || 'Не удалось начать игру. Проверьте введенные данные.';
          this.isPlaying = false;
          this.cd.detectChanges();
        }
    });
  }

  onCellClick(cell: MinesCell): void {
    //проверка игра идет клеткиа не открыта есть gameid
    if(!this.isPlaying || cell.isRevealed || !this.gameId) return;


    const clickedIndex = cell.index;

    //запрос на откртыие клетки
    this.minesService.revealCell(this.gameId, clickedIndex).subscribe({
      next: (res)=> {

        //если попал на мину
        if(res.isHitMine)
        {
          this.isPlaying = false;
          this.isGameOver = true;
          this.isWin = false;


          const mineSet = new Set(res.minePositions || []);

          // Иммутабельно открываем ВСЕ мины на поле для корректного отображения в UI
          this.cells = this.cells.map(c => {
            if (c.index === clickedIndex || mineSet.has(c.index)) {
              return { ...c, isRevealed: true, isMine: true };
            }
            return c;
          });

        } else {
          //безопасная клетка = обновляем множитель и вин
          this.currentMultiplier = res.currentMultiplier;
          this.currentWin = this.betAmount * res.currentMultiplier;

          // Открываем только кликнутую клетку
          this.cells = this.cells.map(c => 
            c.index === clickedIndex ? { ...c, isRevealed: true, isMine: false } : c
          );
        }

        // Обновляем баланс, если сервер вернул его при открытии клетки
        if (res.newBalance !== undefined) {
            this.authService.updateBalance(res.newBalance);
        }

        this.cd.detectChanges();
      },
      error: (err) => {
          console.error('Ошибка при открытии клетки:', err);
        }
    });
  }

  cashOut(): void {
    //проверка если игра идет и есть gameid
    if(!this.isPlaying || !this.gameId) return;

    //запрос на деньги деньги
    this.minesService.cashout(this.gameId).subscribe({
        next: (res) => {
          this.isPlaying = false; //конец игшры
          this.isGameOver = true;
          this.isWin = true;

          // Обновляем баланс в AuthState / Signal / LocalStorage
          if(res.newBalance !== undefined && res.newBalance !== null){
            this.authService.updateBalance(res.newBalance);
          } else if (res.winAmount !== undefined) {
            //   если newBalance не пришел добавляем winAmount к текущему балансу
            const updatedBalance = this.authService.currentBalance() + res.winAmount;
            this.authService.updateBalance(updatedBalance);
          }


          //опен всех мин при забранном кеше
          
          if (res.minePositions && res.minePositions.length > 0) {
            const mineSet = new Set(res.minePositions);
            // превращаем массив индексов мин в Set для быстрого поиска
            this.cells = this.cells.map(c => {
              if (mineSet.has(c.index)) {
                return { 
                  ...c, 
                  isRevealed: true,  //открываем ячейку
                  isMine: true  //отмечаем как мину 
                };
              }
              return c; //остальные без изменений
            });
          }
          // Принудительное обновление интерфейса Angular
          this.cd.detectChanges();
         
        },
        error: (err) => {
          console.error('Ошибка при открытии клетки:', err);
        }
    });
  }


}
