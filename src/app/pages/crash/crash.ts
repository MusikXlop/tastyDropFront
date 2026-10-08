import { Component, OnInit, 
  OnDestroy, ElementRef, ViewChild,
   ChangeDetectorRef, Renderer2, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrashService } from '../../core/services/crash.service';
import { AuthService } from '../../core/services/auth';
import { Subscription } from 'rxjs';
// класс для управления подписками на Observable

@Component({
  selector: 'app-crash',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crash.html',
  styleUrls: ['./crash.scss'],
})
export class CrashComponent implements OnInit, OnDestroy {
  @ViewChild('crashCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  // ссылка на Canvas из шаблона (по #crashCanvas) для холста


  isRoundActive = false;    // Раунд идёт на сервере (летят тики)
  cashoutMultiplier: number | null = null; // Зафиксированный икс выигрыша


  betAmount: number = 1.0; // ставка по умолчанию
  getId: number | null = null; // айд игры
  isPlaying: boolean = false; // флаг что игра идет
  isGameOver: boolean = false; // флаг что игра закончена
  isWin: boolean = false; // флаг что игрок выиграл

  currentMultiplier: number = 1.0; // текущий множитель
  winAmount: number = 0; // сумма выигрыша
  errorMessage: string | null = null; // сообщение об ошибке



  //изображение для наконечника
  private imagesLoaded: boolean = false;
  private subs: Subscription[] = []; // список подписок на Observable 
  private activePersImg: HTMLImageElement = new Image(); //картинка пекрса при старте
  private crashedImg: HTMLImageElement = new Image();      // картинка краша
  constructor(
    private crashService: CrashService,// сервис Crash для запросов
    private authService: AuthService, //авторизация
    //для DOM (Document Object Model)
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef   //обнова ручная юи
  ) {}


  ngOnInit(): void {
        this.renderer.addClass(document.body, 'crash-theme'); //добавляем CSSтему на body
        this.preloadImages();
        
        
       
        this.crashService.startSignalRConnection(); //соеденияем(запуск signalR)
        
        this.initSignalRSubscribers(); // подписываемся на события
        this.loadActiveGame(); //проверка активную игру при запуске
 
 
 
    }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'crash-theme'); // убираем тему при уничтожении
    this.subs.forEach(s => s.unsubscribe()); // отписываемся от всех Observable
    this.crashService.stopSignalRConnection(); //убираем соеденение
  
  }


  //подписка на старт игры
  private initSignalRSubscribers(): void {
    //подписка на старт игры
    this.subs.push(
      this.crashService.onGameStarted.subscribe((data)=> {
        this.ngZone.run(() => {
          console.log('[UI LOG] Game Started event in Component:', data);
          this.getId = data.gameId; //сохранялка игры
          this.isPlaying = true;
          this.isRoundActive = true;
          this.cashoutMultiplier = null;
          this.isGameOver = false;
          this.isWin = false;
          this.currentMultiplier = 1.00;

          //если сервак прислал нью баланс то обновляем его
          if(data.newBalance !== undefined) {
            this.authService.updateBalance(data.newBalance); //обновляем баланс
          }
          this.cdr.detectChanges(); // обновляем ui
        });
      })
    );

    //подписка на тик множителя
    //подписываемся на поток onTick$ который сервер шлёт каждые 50 мс с новым множителем
    this.subs.push(
      this.crashService.onTick.subscribe((multiplier) => {
        this.ngZone.run(() => {
          // Игнорируем тики, только если раунд вообще не идёт на сервере
          if(!this.isRoundActive) 
          {
            console.warn('[UI LOG] Received tick but isRoundActive is false!');
            return;
          }
        });
        
        //обнова текущего множителя
        this.currentMultiplier = multiplier;
        this.drawCanvas(); //перерисовываем график 
        this.cdr.detectChanges();
      })
    );

    // подписка на краш
    //краш шлет когда игра крашнулась
     this.subs.push(
      this.crashService.onCrash.subscribe((data) => {
        this.ngZone.run(() => {
          this.isRoundActive = false; // раунд полностью завершён
          this.isPlaying = false;
          
          

          
          this.isGameOver = true;   // Показываем плашку проигрыша, только если не забирали деньги
          
          console.log('[UI LOG] Crash event in Component:', data);
          this.currentMultiplier = data.crashPoint; //фиксируем множитель на точке

          this.handleCrash(); // обработка краша
          this.drawCanvas();
          this.cdr.detectChanges();
        });
        
      })
    );

    //подписка на потом ошибок который шлет сервер при ошибке
    this.subs.push(
      this.crashService.onError.subscribe((msg) => {
        this.ngZone.run(() => {
          console.error('[UI LOG] Server Error in Component:', msg);
          this.errorMessage = msg;
          this.isPlaying = false;
          this.cdr.detectChanges();
        });
      })
    );
  }

  

  //старт игры
  async startGame(): Promise<void> {
    this.clearError(); //очищаем ошибки
    const error = this.validateInputs();//проверка ввода
    if(error){
      this.errorMessage = error;
      this.cdr.detectChanges()
      return;
    }
    await this.crashService.startGameViaHub(this.betAmount); //старт игры через signalre
  }

  
  cashOut(): void {
    if(!this.isPlaying || !this.getId) return; // если игра не идет или нет айди игры, выходим
    

    //сохраняем текущий мноитель на котором решили зрабраь 
    const snapshotMultiplier = this.currentMultiplier;

    //отправляем запрос на сервер для расчета денег
    this.crashService.cashout(this.getId, snapshotMultiplier).subscribe({
        next:(res) => {
          if(res.status === 'Won') 
          {
            //если сервер вернул статус вин 
            this.isWin = true; //то мы вин
            this.winAmount = res.winAmount; //сохраняем сумму выигрыша
            this.isPlaying = false;         // игра завершена


            //фикация множителя  вина
            this.cashoutMultiplier = res.currentMultiplier || snapshotMultiplier;

            //если сервак прислал нью баланс то обновляем его
            if(res.newBalance !== undefined) {
              this.authService.updateBalance(res.newBalance); 
              //обновляем баланс
            }
          } else {
            //забрали позже(луз)
            if(res.crashPoint){
              this.currentMultiplier = res.crashPoint;//ставим точку краша от сервера
            }
            this.handleCrash(); //инече кращ
          }
          this.drawCanvas();
          this.cdr.detectChanges(); //обновляем ui
        },
        error: (err) => {
          console.error('Ошибка при кэшауте:', err)
          this.handleCrash();
        }
    });
  }





  
  //предзагрузка картинок
  private preloadImages(): void {
    this.activePersImg.src = 'assets/crash/slark_jump_png.avif';
    this.crashedImg.src = 'assets/crash/slark_oof_png.avif';


    //счетчик загруженных картинок
    let loadedCount = 0;
    const onImageLoad = () => {
      loadedCount++;
      if(loadedCount === 2) 
        {
          this.imagesLoaded = true;
          this.drawCanvas(); //рисуем canvas 
        }
    };

    this.activePersImg.onload = onImageLoad;//обаботчик загрузки сларка
    this.crashedImg.onload = onImageLoad; //обработчик загрузки луза


  }

  //текущий вин  = ставка * множитель
  get currentWin(): number {
    return Number((this.betAmount * this.currentMultiplier).toFixed(2));
  }

  validateInputs(): string | null {
    const bet = Number(this.betAmount) || 0; //ставка
    const balance = Number(this.authService.currentBalance()) || 0; // баланс

    if (bet <= 0) return 'АЛО ПОСТАВЬ больше нуля';
    if (bet > balance) return 'у тебя нет денег крабочел'; 
    return null;
  }

    preventInvalidBetChars(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault(); // запрет лишних символов в поле ввода
  }

  onPasteBet(event: ClipboardEvent): void {
    const pasteData = event.clipboardData?.getData('text') || '';
    if (isNaN(parseFloat(pasteData))) event.preventDefault(); // запрет вставки текста
  }

  sanitizeBet(event: Event): void {
    const target = event.target as HTMLInputElement;
    let raw = target.value;
    if (/^0[0-9]/.test(raw)) raw = raw.replace(/^0+/, ''); // убираем ведущие нули
    target.value = raw;
    const parsed = parseFloat(raw);
    this.betAmount = isNaN(parsed) ? 0 : parsed; // парсим число
    this.clearError(); // очищаем ошибки
  }

  clearError(): void {
    this.errorMessage = null; // очищаем ошибки
  }

  loadActiveGame(): void {
    this.crashService.getActiveGame().subscribe({
      next:(game) => {
        if (!game) return; // если нет активной игры, выходим

        //если игра вернула inGame то восстанавливааем ее
        if(game.status === 'InGame')
        {
          this.getId = game.gameId;
          this.betAmount = game.betAmount;
          this.currentMultiplier = game.currentMultiplier;
          
          this.isPlaying = true;
          this.isGameOver =  false;
          this.isWin = false;

          this.drawCanvas();// Принудительно отрисовываем холст
        }else{
          //игра закончился значит сброс стстояния 
          this.isPlaying = false;
          this.getId = null;
        }


        this.cdr.detectChanges(); // обновляем UI
      },
      error: (err) => console.error('Ошибка при загрузке активной игры:', err)
    });
  }

  
  private handleCrash(): void {
      this.isPlaying = false; // игра все
      this.isRoundActive = false;
      this.cdr.detectChanges(); //обновляем ui
    }




  

  private drawCanvas(): void {
    if(!this.canvasRef) return; //если нет canvas, выходим
    const canvas = this.canvasRef.nativeElement; //получаем элемент Canvas
    const ctx = canvas.getContext('2d'); // получаем контекст рисования
    if(!ctx) return; //если нет контекста, выходим

    const width = (canvas.width = canvas.clientWidth); //ширина canvas
    const height = (canvas.height = canvas.clientHeight); //высота canvas
    // задаём размеры Canvas равные его размеру в DOM

    ctx.clearRect(0, 0, width, height); 
    // очищаем холст

     // Сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // цвет линий сетки
    ctx.lineWidth = 1;                             // толщина линий
    for (let x = 0; x < width; x += 50) {          // вертикальные линии
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {         // горизонтальные линии
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    // Отрисовка параболической кривой
    const startX = 40;              // начальная точка x
    const startY = height - 40;     // начальная точка y (внизу)
    const progress = Math.min((this.currentMultiplier - 1) / 10, 1); 
    // прогресс кривой зависит от множителя
    const endX = startX + (width - 80) * Math.min(progress * 1.5, 1); 
    // конечная точка x
    const endY = startY - (height - 80) * Math.min(progress, 1); 
    // конечная точка y

    const controlX = startX + (endX - startX) * 0.5;//контрольнач точка x для кривой
    const controlY = startY; 

    //градиент линии
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    if (this.isGameOver && !this.isWin) {
      //если краш
      gradient.addColorStop(0, '#ff4d4d');
      gradient.addColorStop(1, '#ff0055');
    } else {
      //если се фа ин
      gradient.addColorStop(0, '#00f2fe');
      gradient.addColorStop(1, '#4facfe');
    }

    // Заполнение области под кривой
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.closePath();
    ctx.fillStyle = this.isGameOver && !this.isWin ? 'rgba(255, 0, 85, 0.15)' : 'rgba(79, 172, 254, 0.15)';
    ctx.fill();

    // Главная кривая
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.stroke();

    //отрисовка картикнки на наконечной 
    const imgToDraw = (this.isGameOver && !this.isWin) ? this.crashedImg : this.activePersImg;

    //выбор картинки (сларк вин) или сларк луз
    const imgSize= 40;

        //если картинка загружена 
    if(imgToDraw.complete && imgToDraw.naturalWidth !== 0)
    {
      //отрисовка картинки по координатам конце кривой 
      ctx.drawImage(imgToDraw, endX - imgSize / 2, endY - imgSize /2, imgSize, imgSize);
    } else {
      //если картинку не загрузиолро то рисуется точка 
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fillStyle = this.isGameOver && !this.isWin ? '#ff0055' : '#00f2fe';
      ctx.shadowColor = this.isGameOver && !this.isWin ? '#ff0055' : '#00f2fe';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

  }
  
}
