import { Component, OnInit, ChangeDetectorRef, OnDestroy, Renderer2 } from '@angular/core';

//ngif ngfor...
import { CommonModule } from '@angular/common';

//ngmodel(банан)
import { FormsModule } from '@angular/forms';

import { CaseService, InventoryItem, CaseItem, WonItemDto, UpgradeResultDto } from '../../services/case';

//отправка http запросов(получать все шмотки из бд)
import { HttpClient } from '@angular/common/http';

import { RouterModule  } from '@angular/router';



@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule ],
  templateUrl: './upgrade.html',
  styleUrls: ['./upgrade.scss'],
})
export class UpgradeComponent implements OnInit, OnDestroy {
  //для выбоора 
  myInventory: InventoryItem[] = []; //инвентарь юзера
  allItems: CaseItem[] = []; //шмотки из бд(все мои)
  filteredAllItems: CaseItem[] = []; //отфильтрованный список шмоток


  // Заглушки для пустого инвентаря(в апргрейдере)
  placeholderItems = Array(20);

  //выбранные предметы 
  //шмотка которую юзер ставит
  selectedSourceItem: InventoryItem | null = null;
  selectedTargetItem: CaseItem | null = null; //шмотку котору он хочет получить

  //фильтр к поиску для правого блока
  searchQuery: string = ''; // по названию искать
  selectedRarity: string = 'all'; //по редкости

  //мин и макс прайсы для филтрацми
  minPrice: number | null = null;
  maxPrice: number | null = null;


  //состояние ui 
  isLoadingInventory: boolean = true; //флаг для загрузки инвентаря
  isLoadingAllItems: boolean = true; // флаг для загрузки всех шмоток
  isUpgrading: boolean = false; //блокировка интерфейса во время анимации


  //хранит число которое пришло с бека для анимации
  rollValue: number = 0;

// Храним текущий НАКОПЛЕННЫЙ угол чтобы никогда не сбрасывать его в 0
  arrowAngle: number = 0;


  //null nothing  true win   false lose 
  isWin: boolean | null = null;

  //предмет который юзер получил если апгрейд будет успешный
  wonItemResult: WonItemDto | null = null;


  //для запроса к серваку
  private apiUrl = 'https://localhost:7141/api';


   constructor(
    private caseService: CaseService, //сервис  для работы с серваком и инвентарем
    private http: HttpClient, //http запросы 
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef // для ручной обработки интерфейса 
  ) {}

  //вызывается при инициализации компонента 
  ngOnInit(): void {
    //загружаем данные пользователя и и список всех шмотк
    this.loadUserInventory();
    this.loadAllDatabaseItems();

    // Навешиваем класс фона при открытии компонента
    this.renderer.addClass(document.body, 'upgrade-theme');
  }

  ngOnDestroy(): void {
    // Удаляем класс фона при выходе с компонента
    this.renderer.removeClass(document.body, 'upgrade-theme');
  }



  //инвентарь текущего пользователя 
  loadUserInventory(): void {
    this.isLoadingInventory = true;
    this.caseService.getInventory().subscribe({
      next: (items) => {
        this.myInventory = items; //сохраняем инвентарь
        this.isLoadingInventory = false; //вырубаем загрущку
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ошибка при загрузке инвентаря', err);
        this.isLoadingInventory = false;
        this.cdr.detectChanges();
      }
    });
  }

  //  Загружаем список всех предметов из БД для выбора цели
  loadAllDatabaseItems(): void {
    this.isLoadingAllItems = true;
    // Отправляем запрос на получение всех предметов магазина
    this.http.get<CaseItem[]>(`${this.apiUrl}/items/all`).subscribe({
      next: (items) => {
        // Сортируем по цене от дорогих к дешевым
        this.allItems = items.sort((a, b) => b.price - a.price);
        this.filteredAllItems = [...this.allItems]; // копируем для филтрации
        this.isLoadingAllItems = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Ошибка загрузки всех предметов:', err);
        this.isLoadingAllItems = false;
        this.cdr.detectChanges();
      }
    });
  }

  //выбор своего предмета(лево)
  selectSourceItem(item: InventoryItem): void{
    if(this.isUpgrading) return; //если апгрейдится то не можем ничо делоать
    this.isWin = null; // Сбрасываем свечение при кликах
    
    //ЕСЛИ КЛИКНУЛИ УЖЕ по выбранной шмотки то снимаем выбор (ставлю null)
    if (this.selectedSourceItem?.inventoryId === item.inventoryId) {
      this.selectedSourceItem = null;
    } else {
      //иначе выбирает новую
      this.selectedSourceItem = item; 
    }
    this.cdr.detectChanges();
  }

  //выбор (на чо хотим заапгрейдить)
  selectTargetItem(item: CaseItem): void{
    if(this.isUpgrading) return;
    this.isWin = null; // Сбрасываем свечение при кликах
    //ЕСЛИ КЛИКНУЛИ УЖЕ по выбранной шмотки то снимаем выбор (ставлю null)
    if(this.selectedTargetItem?.itemId === item.itemId)
    {
      this.selectedTargetItem = null;
    }else {
      this.selectedTargetItem = item;
    }
    this.cdr.detectChanges();
  }

  //расчет шансов от 0 до 100
  get winChance(): number {
    if(!this.selectedSourceItem || !this.selectedTargetItem) return 0;

    const sourcePrice = this.selectedSourceItem.price; //цена моего предмета
    const targetPrice = this.selectedTargetItem.price;//цена которого я хочу  
    
    if(targetPrice <= 0) return 0;

    //формула (цена моего / цена которого я хочу ) * 100
    const chance = (sourcePrice / targetPrice) * 100;

    //ограничиваю максимум шанс в 100%
    return Math.min(Math.round(chance * 100) / 100, 100);
  }




  //текст описание шаблона для бека 
  get chanceLabel(): string {
    const chance = this.winChance;


    // Если предметы ещё не выбраны — показываем этот текст.
    if (!this.selectedSourceItem || !this.selectedTargetItem) {
      return 'Выберите шо будешь ухудшать';
    }

    //если моя шмотка дороже чем я выбрал то показываю
    if (this.selectedSourceItem && this.selectedTargetItem &&
      this.selectedSourceItem.price > this.selectedTargetItem.price) {
    return 'Ухудши свой скин';
  }


    if (chance === 0) return 'У тебя нет шансов даже пытаться не буду';
    if (chance < 10) return 'АЛЛ ЫН ДАВАЙ ';
    if (chance < 20) return 'Не ЧЕТО НЕ ХОЧУ ПОКА';
    if (chance < 30) return 'Ну я бы не втерпел';
    if (chance < 40) return 'Мне лень на это придумывать текст';
    if (chance < 50) return 'Ну чота чота';
    if (chance < 60) return 'СЕ ФА ИН ПРОКНЕТ';
    if (chance < 70) return 'ДЕЛАЙ ДЕЛАЙ W W W';
    return 'Биг шанс(нет)';
  }

  //фильтрация по поиску предметов 
  applyFilters(): void {
    //БЕРЕМ МАссив всех предматов allItems
    /*метод filter создает нью массив оставив только те элементы которое подходят под условие*/
    this.filteredAllItems = this.allItems.filter(item => {
      //название предмета в нижнем регистре и .includes седержит ли оно сроку поиска
      const matchesSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      //если выбрано all то пропускаем все предметы иначе сравниваем редкость предмета item.rarity
      //с выбранной selectedRarity
      //если совпадает то matchesRarity = true
      const matchesRarity = this.selectedRarity === 'all' ||
        item.rarity.toLocaleLowerCase() === this.selectedRarity.toLowerCase();
        //попадают в итоговый список только если оба условия тру (назва и поиском и редкость с филтролм )
     
      //филтр по мин цене (если заполнен то проверяем item.price >= this.minPrice)
      const matchessMinPrice = this.minPrice === null ||
       this.minPrice === undefined ||
       item.price >= this.minPrice;

       //филтр по макс 
      const matchesMaxPrice = this.maxPrice === null ||
       this.maxPrice === undefined ||
       item.price <= this.maxPrice;

     
      return matchesSearch && matchesRarity && matchesMaxPrice && matchessMinPrice;
    });
    this.cdr.detectChanges();
  }


  //редкости предмета
  getRarityClass(rarity: string): string {
    switch(rarity?.toLowerCase()) {
      case 'arcana': return 'rarity-arcana';
      case 'immortal': return 'rarity-immortal';
      case 'legendary': return 'rarity-legendary';
      case 'mythical': return 'rarity-mythical';
      case 'rare': return 'rarity-rare';
      default: return 'rarity-common';
    }
  }

  // Заглушка обработки отсутствующих картинок
  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/cases/midascase.png';
  }


  //заглушка по кнопке апгрейд(на беке наполню )
  startUpgrade(): void {
    
    if (!this.selectedSourceItem || //шмотка должна быть выбрана 
      !this.selectedTargetItem || //шмотка должна быть выбрана 
      this.winChance <= 0 ||  //шанс должен быть больше нуля
      this.isUpgrading) { //другой апгрейд не выолнится  
      return;
    }
    
    //блокировка интерфейса (чтоб нельзя было нажать несколько раз)
    this.isUpgrading = true;

    //сброс старого результатыча (вин чи вуз)
    this.isWin = null;

    //сброс старого полученого предмета 
    this.wonItemResult = null;

    //ФОрмируем объект который отправи на ьекенд 
    const payload = {

      // ID предмета пользователя из UserInventory
      inventoryId: this.selectedSourceItem.inventoryId,

      // ID предмета, который хотим получить из Items
      targetItemId: this.selectedTargetItem.itemId
    };

    //отправляем post запрос на api/upgrade/run
    // <UpgradeResultDto> говорит typescript
    // какой тип ответа мы ожидаем от сервера
    this.http.post<UpgradeResultDto>(
      `${this.apiUrl}/upgrade/run`,
      payload
    ).subscribe({
      //если успаех
      next: (res) => {

        console.log('UPGRADE RESPONSE:', res);
        console.log('ROLL:', res.rollValue);
        console.log('WIN:', res.isSuccess);
        console.log('CHANCE:', res.winChance);
        console.log('WON ITEM:', res.wonItem);


        //то передаем результат серсеру в функцию анимации
        this.animatedRoll(
          res.rollValue, //выпавшее число
          res.isSuccess, // win/lose
          res.wonItem // take item or null 
        );
      },
      error: (err) => {
        console.error('Ошибка при выполнении апгрейда:', err);

        // Разрешаем снова нажимать кнопку
        this.isUpgrading = false;

        this.cdr.detectChanges();
      }
    });
  }

  //функция отвечает за отображение результата после получение ответа от бека 
  private animatedRoll(
    rollValue: number,
    isSuccess: boolean,
    wonItem: WonItemDto | null
  ): void {
    console.log('=== ANIMATION START ===');
    console.log('rollValue:', rollValue);
    console.log('isSuccess:', isSuccess);
    console.log('wonItem:', wonItem);

    //  Включаем статус прокрутки
    this.isUpgrading = true;
    
    //сохраняем число которое выпало на серваке 
    //его используем для положения стрелки 
    this.rollValue = rollValue;


    //считаем целевое значение угла на циферблате (от 0 до 360)
    const targetDegree = rollValue * 3.6;

    //нахоим текущий остаток окружност от прошлый вращений
    const currentModulo = this.arrowAngle % 360;

    //вычисляем сколько над докрутить до целевого угла
    let distanceToTarget = targetDegree - currentModulo;

    //если целевой уголь меньше текущего остака то добавляем олный круг
    if(distanceToTarget <= 0) {
      distanceToTarget += 360;
    }

    //прибавляем 5 полных оборотов 1800 + дистанцию до цели
    //всегда стрелка делает 5 оборотов вперед от своего текущего положения
    this.arrowAngle += 1800 + distanceToTarget;
    this.cdr.detectChanges();
    

    



    //ожидалка пару сек пока крутится 
    setTimeout(() => {

      //сохраняем результат true win false lose 
      this.isWin = isSuccess;

      //сохраняем полученный предмет если луз то будет null
      this.wonItemResult = wonItem;

      //unblock interface 
      this.isUpgrading = false;


      //обновляем инвентарь после завершения анимации (луз предмет минусч из инвентаря а вин туда )
      this.loadUserInventory();

      //после завершения апгрейда очищаем выбранный предмет
      this.selectedSourceItem = null;

      //очищаем тот который хотели запгрейдить
      this.selectedTargetItem = null;

      this.cdr.detectChanges();

    }, 8000);

  }

}
