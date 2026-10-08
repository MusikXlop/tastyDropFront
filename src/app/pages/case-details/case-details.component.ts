import { Component, 
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
   ElementRef, 
   ViewChildren, QueryList } from '@angular/core'; //OnInit 
import { CommonModule } from '@angular/common';//ngIF
//длля параметров из url    и для работы с маршрутизацией 
import { ActivatedRoute, RouterModule, Router } from '@angular/router'; 
import { CaseService, CaseModel, CaseItem, OpenCaseResult, InventoryItem } from '../../services/case';
//сервис авторизации пользователя (шоб брать баланс)
import { AuthService } from '../../core/services/auth';
//модалка пополнения 
import { TopUpModalComponent } from '../../components/top-up-modal/top-up-modal';
import { Subscription } from 'rxjs';

//интерфйес для управления отдельной рулеткой
export interface RouletteTrackData {
  id: number;
  items: (CaseItem | InventoryItem)[];
}

@Component({
  selector: 'app-case-details',
  standalone: true,
  imports: [CommonModule,RouterModule,TopUpModalComponent],
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.scss'],
})
export class CaseDetailsComponent implements OnInit, OnDestroy {
  //ссылка на HTML элемент ленты рулетки
  @ViewChildren('rouletteTrack') rouletteTracks!: QueryList<ElementRef<HTMLDivElement>>;
    
  caseId!: number; //id кейса из ссылки
  currentCase: CaseModel | null = null; //текущий кейс
  items: CaseItem[] = []; //список предметом из бд


  //для выбора мультикасты
  selectedAmount: number = 1;

  //состояния модалки пополнения баланса 
  isTopUpOpen: boolean = false;


  //флаг состояния рулетки
  isSpinning: boolean = false; 

  //флаг от повторого клика продажи
  isSelling: boolean = false;


  //флаш бесплатного кейса
  isFreeAvailable: boolean = false;


  //переменные для рулетки
  //массив для хранениея данныех рулетки от 1 до 5(мультикаст)
  rouletteTracksData: RouletteTrackData[] = [];

  //массив выбитых предметов и общ сумма продажи
  wonItems: InventoryItem[] = [];


  //храним индетификаторы таймеров анимации чтоб отменять их
  private spinStartTimeout: ReturnType<typeof setTimeout> | null = null;
  private spinEndTimeout: ReturnType<typeof setTimeout> | null = null;

  // Подписки для отмены при переключении кейсов
  private openCaseSub: Subscription | null = null;
  private activeSpinCaseId: number | null = null; // ID кейса для которого сейчас крутится рулетка

  /*внедряем зависимости
  roure чтоб получить айди из url
  caseService чтоб грузить кейсы и предметы
  authService для проверки баланса */
  constructor(
    private route: ActivatedRoute,// для получения id из URL
    private caseService: CaseService,// сервис для работы с кейсами
    private router: Router,
    public authService: AuthService, // сервис авторизации (баланс)
    private cdr: ChangeDetectorRef // для ручного обновления View 
  ) {}



  //при инициализации берем айди из url 
  ngOnInit(): void {

    //подписываемся на изменения в параметрах url
    this.route.paramMap.subscribe(params => {
        //получаем айди кейса из url
        const idParam = params.get('id');
        const newCaseId = Number(idParam);


        if(newCaseId) {
          /*фикс бага шо через лайв заходил на кейс и прошлый открывался просто спин сбросить */
          //  Полностью сбрасываем спины и отменяем зависший HTTPзапрос прошлых кейсов
          this.resetSpinState();



          //сброс остояния
          this.isSpinning = false; // разблок кнопки крутит
          this.wonItems = []; //модалку вина закрыть

          //возврат рулетки в дефолт
          this.resetTrackPositions();


          //  ОБНОВАЙ АЙДИ и загрузка нью кейса 
          this.caseId = newCaseId;
          this.loadCaseData(this.caseId);
        }
    });

  }

  ngOnDestroy(): void {
    this.resetSpinState();
  }

  //метод очистки состояния списка 
  private resetSpinState(): void {
    this.clearSpinTimeouts();

    //отмена http запроса 
    if(this.openCaseSub){
      this.openCaseSub.unsubscribe();
      this.openCaseSub = null;
    }

    this.activeSpinCaseId = null;
  }

  //метод сброса позиции ленты (крутка)
  private resetTrackPositions(): void{
    // сброс стилей анимации
    if (this.rouletteTracks) {
      this.rouletteTracks.forEach(track => {
        const el = track.nativeElement;
        el.style.transition = 'none';
        el.style.transform = 'translateX(0px)';
      });
    }
  }


  //метод для отметы активный таймеров спина
  private clearSpinTimeouts(): void{
    if(this.spinStartTimeout) {
      clearTimeout(this.spinStartTimeout);
      this.spinStartTimeout = null;
    }
    if (this.spinEndTimeout){
      clearTimeout(this.spinEndTimeout);
      this.spinEndTimeout = null;
    }
  }


  //загружаем список кейсов и ищем тот который совпадает в caseId
  private loadCaseData(id: number): void{
    this.caseService.getCases().subscribe(cases => {
      this.currentCase = cases.find(c=> Number(c.caseId) === id) || null;
      this.cdr.detectChanges()
      console.log('Текущий кейс:', this.currentCase);
      this.cdr.detectChanges();
    });
      
      //загружаем предметы внутри кейса и сохраняем их в items
      this.caseService.getCaseItems(id).subscribe({
        next: (itemsData) => {
          //сохраняем ориг массив 
          this.items = itemsData.sort((a, b) => b.price - a.price); //от дорогих к дешевым 
          
          this.rebuildTracks();
          console.log('Предметы кейса:', itemsData);
          this.cdr.detectChanges();
        },
        error: (err) => console.error('ошибка внутри загрузки предметов кейса', err)
      });

      //проверка наличия фри куейса (через айди)
      this.checkFreeStatus(id);
  }
    

 
  


  navigateToBattlePass(): void {
    this.router.navigate(['/battle-pass']);
  }

  //
  checkFreeStatus(id: number): void{
    this.caseService.checkFreeStatus(id).subscribe({
      next:(res) => {
        this.isFreeAvailable  = res.isFreeAvailable;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Ошибка проверки бесплатного статуса', err)
    });
  }

  //МЕТОД мультикаста x1...x5
  selectAmount(amount: number): void {
    if(this.isSpinning) return;
    this.selectedAmount = amount;
    this.rebuildTracks();
    this.cdr.detectChanges();
  }


  //формирование дорожек рулетки в зависимости от колва(selectedAmount)
  rebuildTracks(): void {
    if(this.items.length === 0) return;
    this.rouletteTracksData = [];

      for (let i = 0; i < this.selectedAmount; i++) {
      const trackItems: (CaseItem | InventoryItem)[] = [];
      
      // Заполняем ленту случайными перемешанными предметами
      for (let j = 0; j < 8; j++) {
        // Каждый раз при дублировании вызываем перемешку массива
        trackItems.push(...this.shuffleItems(this.items));
      }

      this.rouletteTracksData.push({
        id: i,
        items: trackItems
      });
    }
  }





  //проверка баланса из сигнала AuthService
  //если доступен бесплатный и выбран х1 то баланс не чекаем
  get canAfford(): boolean {
    if (!this.currentCase) return false;

    //если юзер не авторизовал то блок с регистрацией 
    if(!this.authService.currentUser()) {
      return false;
    }


    if (this.isFreeAvailable  && this.selectedAmount === 1) return true;

    const totalCost = this.currentCase.price * this.selectedAmount;

    //если кейс продается за бп
    if(this.currentCase.currency == 'BP') {
      return (this.authService.battlePassBalance?.() ?? 0) >= totalCost;
    }

    return this.authService.currentBalance() >= totalCost;
    

  }

  //общая стоимость всех выбитых предметов в модалке
  get totalWonPrice(): number {
    return this.wonItems.reduce((sum, item) => sum + item.price, 0);
  }


  //управляем модалкой 
  openTopUpModal(): void {
    this.isTopUpOpen = true;
    this.cdr.markForCheck();
  }

  closeTopUpModal(): void{
    this.isTopUpOpen = false;
    this.cdr.markForCheck();
  }

  //возвращаем css класс подсветки предметов по редкости
  getRarityClass(rarity: string): string{
    switch(rarity?.toLowerCase()) {
      case 'arcana': return 'rarity-arcana';
      case 'immortal': return 'rarity-immortal';
      case 'legendary': return 'rarity-legendary';
      case 'mythical': return 'rarity-mythical';
      case 'rare': return 'rarity-rare';
      default: return 'rarity-common';
    }
  }

  //если картинка не загрузилась то по дефолту эту 
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/cases/midascase.png';
  }

  // Метод для перехода на страницу регистрации
  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }
    
  //позже добавить анимацию (ДОБАВЛЯЕМ ОТКРЫТИЕ КЕЙСА)
  openCase() {
    //если не залогинен то переправка на регистрацию
    if(!this.authService.currentUser()) {
      this.navigateToRegister();
      return;
    }

    if (!this.canAfford || this.isSpinning) return; //проверка баланса и состояния рулетки
   
    // Если нажали на "бесплатную/байтовую" кнопку — сразу убираем её из DOM
    if (this.isFreeAvailable && this.selectedAmount === 1) {
      this.isFreeAvailable = false;
    }
   
   //сброс прошлых таймеров перед началом нью спина
    this.resetSpinState();
    //запоминает целевой id для проверки 
    const targetCaseId = this.caseId;
    this.activeSpinCaseId = targetCaseId;


    this.isSpinning = true;
    this.wonItems = [];
    this.cdr.detectChanges();

    //для лога
    const balanceBeforeOpen = this.authService.currentBalance();
    const totalPrice = (this.currentCase?.price || 0) * this.selectedAmount;

   console.log(`%c[OPEN_CASE START]`, 'color: #00ffff; font-weight: bold;', {
      caseId: this.caseId,
      selectedAmount: this.selectedAmount,
      caseUnitPrice: this.currentCase?.price,
      totalExpectedDeduction: totalPrice,
      balanceInAuthServiceBefore: balanceBeforeOpen,
      balanceInLocalStorageBefore: localStorage.getItem('balance')
    });




    //отправляем запрос на бекенд
    this.openCaseSub = this.caseService.openCase(targetCaseId, this.selectedAmount).subscribe({
      next: (res: OpenCaseResult) => {

        console.log(`%c[OPEN_CASE RESPONSE]`, 'color: #00ff00; font-weight: bold;', {
          serverNewBalance: res.newBalance,
          itemsWonCount: res.wonItemDto?.length,
          wonItems: res.wonItemDto,
          mathDiff: balanceBeforeOpen - res.newBalance // Сколько реально списала БД
        });
        // Игнорируем ответ если пользователь уже юзер на другой кейс
        if (this.caseId !== targetCaseId || this.activeSpinCaseId !== targetCaseId) {
          console.warn('[OPEN_CASE IGNORED] Ответ пришел для старого кейса');
          return;
        }


        //Проверка-защита от пустого массива или null с бэкенда
        if (!res.wonItemDto || res.wonItemDto.length === 0) 
        {
          console.error('[OPEN_CASE ERROR] Сервер вернул пустой список предметов');       
          this.isSpinning = false;
          this.cdr.detectChanges();
          return;
        }


        //если сработал бесплатный кейс то снимаем флаг с бесплатно
        if (res.isFreeOpen){
            this.isFreeAvailable  = false;
            this.cdr.markForCheck();  // Помечает компонент для проверки изменений
            this.cdr.detectChanges(); // Принудительно запускает перерисовку UI
        } else {
          if (res.newBalance !== undefined && res.newBalance !== null)
          {
            //иначе обновляем балан
            //обновление баланса
            //обновляем реактивный сигнал и ангуляр перерисовывает интерфейс
            this.authService.currentBalance.set(res.newBalance);
            //сохраняет баланс между перезагрузками страницы 
            localStorage.setItem('balance', res.newBalance.toString());
          }

          // Если кейс был за BP или вернулся BP-баланс  обновляем и его
          if (res.newBattlePassBalance !== undefined && res.newBattlePassBalance !== null) {
            this.authService.updateBpBalance(res.newBattlePassBalance);
          }



          console.log(`%c[OPEN_CASE BALANCE UPDATED]`, 'color: #ffff00;', {
            newBalanceInAuthService: this.authService.currentBalance(),
            newBalanceInLocalStorage: localStorage.getItem('balance')
          });
        }

        //запускаем анимацию(всех прокрутов одновременно) передаем targetCaseId в функцию анимации
        this.spinAllRoulettes(res.wonItemDto, targetCaseId);
        console.log('wonItemDto:', res.wonItemDto);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`%c[OPEN_CASE SERVER ERROR]`, 'color: #ff0000; font-weight: bold;', err);
        //сброс флага вращения если остаемся на том же кейсе 
        if (this.caseId === targetCaseId) {
          this.isSpinning = false;
          this.cdr.detectChanges();
        }
      }
    });
  }




  //перемешка массива 
  /* каждлому предмеу передается случайно число sort 
  Список сортируется по этому числу.
  В итоге порядок предметов меняется каждый раз. */ 
  shuffleItems(items: CaseItem[]): CaseItem[]{
    return items
    .map(i => ({i, sort: Math.random() }))
    .sort((a,b) => a.sort - b.sort)
    .map(({ i }) => i);
  }


  //анимация рулетки
  spinAllRoulettes(winners: InventoryItem[], spinCaseId: number): void{
    const trackElements = this.rouletteTracks.toArray();
    const winnerIndex = 35; // позиция победителя в ленте 


    //фиксируем текущую поз css анимации перед сбросом
    trackElements.forEach(track => {
      const trackEl = track.nativeElement;
      const computedStyle = window.getComputedStyle(trackEl);
      const matrix = new WebKitCSSMatrix(computedStyle.transform);
      const currentX = matrix.m41; //получает текущий х сдвига
      
      
      // убираем плавность
      trackEl.style.transition = 'none';
      // фиксируем позицию
      trackEl.style.transform = `translateX(${currentX}px)`;

    });



    //формируем индивидуальный списки предметов для каждой ленты
    winners.forEach((winner, index)=> {
      const spinList: (CaseItem | InventoryItem)[] = [];
      const shuffled = this.shuffleItems(this.items);

      for(let i = 0; i < 45; i++){
        if(i === winnerIndex) {
          spinList.push(winner);
        }else {
          spinList.push(shuffled[i % shuffled.length]);
        }
      }
      this.rouletteTracksData[index].items = spinList;
    });

    this.cdr.detectChanges();
    //использовазние едниной функции сьброса стилей (аимации)
    this.resetTrackPositions();


    this.spinStartTimeout = setTimeout(() => {
      //проверка что кейс не переключили во время задердки 
      if(this.caseId !== spinCaseId) return;



      trackElements.forEach(track => {
          const trackEl = track.nativeElement;
          //динамическивычисляем ширину карточки
          //берем первую карточку из ленты
          const itemEl = trackEl.querySelector('.roulette-item') as HTMLElement;
          //ширина карточки + gap (12px) еслм не нашли то 152 ствим 
          const itemWidth = itemEl ? itemEl.offsetWidth + 12 : 152;

          //ширина контейнера рулетки 800
          const wrapperWidth = trackEl.parentElement?.clientWidth || 800;
          // случайное смещение, чтобы стрелка не всегда попадала идеально в центр
          const randomOffset = Math.floor(Math.random() * 80) - 40;

        //считаем позицию чтоб вин шмотка оказалась под стрелкой
        const targetPosition = (winnerIndex * itemWidth) - (wrapperWidth / 2) + (itemWidth / 2) + randomOffset;


        // Принудительный reflow для применения начальной точки transform перед анимацией
        void trackEl.offsetWidth;


        //задаем плавную анимацию (5 сек)
        trackEl.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)';

        // смещаем ленту на рассчитанное значение
        trackEl.style.transform = `translateX(-${targetPosition}px)`;

      });
      

    
      this.spinEndTimeout = setTimeout(() => {
        //завершение анимации ток если кейс все еще активен 
        if(this.caseId === spinCaseId) {
           this.isSpinning = false; //рулетка стоп
          this.wonItems = winners; //сохраняем победителя
          this.cdr.detectChanges();// обновляем View
        }
      }, 5000); //ждем окончание анимации (5 сек)
    }, 50) // даем ангуляру время  на рендер 50 мс

  }
  

  //нажали вернутся к кейсу (предмет оставляю в инвентаре)
  closeWinModal() {
    this.wonItems = [];
    this.rebuildTracks();
    this.cdr.detectChanges();
  }

  //нажали продать
  async sellWonItems(): Promise<void> {
    //+ защита от двойного клдика 
    if(this.wonItems.length === 0 || this.isSelling) return;

    this.isSelling = true;
    
    try 
    {
        //проверка валидности предмета перед отправкой 
      const validItems = this.wonItems.filter(item => item && (item.inventoryId 
        || item.itemId));

      if(validItems.length === 0) {
        console.error('[SELL_ITEMS ERROR] У предметов нет валидных ID', this.wonItems);    
        this.closeWinModal();
        return;
      }

      const startBalance = this.authService.currentBalance();
      console.log(`%c[SELL_ALL START]`, 'color: #ff00ff; font-weight: bold;', {
        itemsToSellCount: validItems.length,
        currentBalance: startBalance,
        items: validItems.map(i => ({ id: i.inventoryId ?? i.itemId, price: i.price, name: i.name }))
      });


      //продаем шмотки последовтательно шоб сервак успел пересчитывать баланс
      for(let i = 0; i < validItems.length; i++){
        const item = validItems[i];
        const targetId = item.inventoryId ?? item.itemId;

        try {
          console.log(`[SELL_ITEM Request ${i + 1}/${validItems.length}] Selling inventoryId/itemId: ${targetId}`);

          //переобразуем Observable в Promise для await 
          const res = await this.caseService.sellItem(targetId, item.itemId).toPromise();

          if(res && res.newBalance !== undefined){
            console.log(`%c[SELL_ITEM Success ${i + 1}]`, 'color: #00ff00;', {
              soldItem: item.name,
              itemPrice: item.price,
              returnedNewBalance: res.newBalance
            });

            this.authService.currentBalance.set(res.newBalance);
            localStorage.setItem('balance', res.newBalance.toString());
          }
        } catch (err){
          console.error(`[SELL_ITEM Error ${i + 1}] Ошибка при продаже предмета ${item.name}:`, err);
          console.error('[OPEN_CASE SERVER ERROR]', err);
        }
      }

      console.log(`%c[SELL_ALL FINISHED]`, 'color: #ff00ff; font-weight: bold;', {
        finalBalanceInAuthService: this.authService.currentBalance()
      });

      // Очищаем выбитые предметы и закрываем окно
      this.closeWinModal(); 

    } finally {
      // Сбрасываем флаг блокировки обратно в false в самом конце (даже если произошли ошибки)
      this.isSelling = false;
    }
  }
}

