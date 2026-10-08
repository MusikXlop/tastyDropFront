import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { CaseService, InventoryItem, BestDrop   } from '../../services/case';
import { finalize } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { BattlePassService } from '../../services/battle-pass.service';

//уведомлялки 
export interface ToastNotification {
  id: number; // уникальный идентификатор уведомления
  message: string; // текст уведомления
  type: 'success' | 'error'; // тип уведомления
}

@Component({
  selector: 'app-profile',
  standalone: true,// Компонент является автономным (Standalone)
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})



export class ProfileComponent implements OnInit  {
  //массив предметов пользователя в инвентаре(ща пуст ) потом запонлить с бэкэнда
  userItems: InventoryItem [] = [];
  //переменная для хранения бест оф зе бест дропа
  bestDrop: BestDrop | null = null;

  isLoading: boolean = false; //флаг загрузки данных

  //массик активных уведомлений
  toasts: ToastNotification[] = [];

  //флаги профиля
  targetUserId: number | null = null;
  isOwnProfile: boolean = true; //свой профиль
  targetUsername: string = 'Загрузка...';// Имя пользователя для отображения в шаблоне

  // Переменная для уровня
  userBpLevel: number = 1;


  // внедряем AuthService с ключом public чтоб иметь прямой доступ к нему
  constructor(public authService: AuthService,
     private caseService: CaseService, 
     private cdr: ChangeDetectorRef,
     private bpService: BattlePassService,
     private route: ActivatedRoute) {}


  ngOnInit(): void {
    //подписывааем на изменения параметров url(/profile или profile/12)
    this.route.params.subscribe(params => {
      const idFromUrl = params['id'];

      //получаем id текущего авторизованного пользователя из сервиса
      const myUserId = this.authService.currentUserId();

      console.log('ID из URL:', idFromUrl);
      console.log('Мой текущий ID из AuthService:', myUserId);

      if(idFromUrl) {
        //ЕСЛИ в айди есть id то открываем чужой профайл
        this.targetUserId =  +idFromUrl;

        //проверка если открыли свой же id тоо это свой профайл
        //если не совпадают то не наш 
        this.isOwnProfile = myUserId !== null && myUserId === this.targetUserId;
      } else {
        //если нет айди (просто /profile) то это значит смотрим свой профиль
        this.targetUserId = myUserId;
        this.isOwnProfile = true;
      }
      //настраиваем отображаемое имя 
      if(this.isOwnProfile) {
        this.targetUsername = this.authService.currentUser() || 'МОй профайл';
      } else  if (this.targetUserId) {
        //запрашиваем ток username из бд
        this.caseService.getUsernameById(this.targetUserId).subscribe({
          next: (res) => {
           this.targetUsername = res.username;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Ошибка при получении ника:', err);
            this.targetUsername = 'Пользователь';
          }
        });
      }
      
        this.loadInventory();
        this.loadBestDrop();
        this.loadUserBpLevel();
    });
  }

  //лвл батл паса
  loadUserBpLevel(): void{
    /*наш профайл  значит user id нре передаем
      не наш значит берем targetUserId*/ 
    const reqUserId = this.isOwnProfile ? undefined : (this.targetUserId ?? undefined);
    

    //делаем запос к api через bpService
    this.bpService.getCurrentLevel(reqUserId).subscribe({
      next: (res)=> {
        //сохраняем лвл если он null ставим 1
        this.userBpLevel = res.currentLevel || 1;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("ошибочка загрузки ЛВЛА бравл пасса", err)
    });
  }

  /* для профайл лвла батл пасса хелпак вычисляем номер тира рамка оть  1 до 7
  каждые 15 лвлов нью тир ТУТ БЕРЕМ ТОК СТРОКИ 01 02...07*/
  getBpTierIndex(): string {
    const tier = Math.min(Math.floor((this.userBpLevel - 1) / 15) + 1, 7);
    //возврат строки 01 02 ...ю 07
    return tier < 10  ? `0${tier}` : `${tier}`;
  }

  //номер лвла ЛЛВАП батл пасса от 01 до 99
  getFormattedLevelNumber():string {
    const lvl = Math.min(Math.max(this.userBpLevel, 1), 105);
    return lvl < 10 ? `0${lvl}` : `${lvl}`;
  }




  //загрузка бест оф зе бест дропа
  loadBestDrop(): void{
    /*наш профайл  значит user id нре передаем
      не наш значит берем targetUserId*/ 
    const reqUserId = this.isOwnProfile ? undefined : (this.targetUserId ?? undefined);
    
    //делаем запос к api через caseService
    this.caseService.getBestDrop(reqUserId).subscribe({
      next: (drop) => {
        //проверка что вернулся именно объект с инфой о шмотке 
        if(drop && drop.name) {
          this.bestDrop = drop;
        }else {
          this.bestDrop = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ошибочка зарузки бест оф зе бест дропа',err);
        this.bestDrop = null;
      }
    });
  }

  //метод для вызова всплывающего уведомления
  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const id = Date.now(); // используем текущую метку времени как уникальный идентификатор
    this.toasts.push({ id, message, type });
    this.cdr.detectChanges(); // уведомляем Angular о необходимости обновить представление
    
    // автоматически удаляем уведомление через 3.5 секунды
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.cdr.detectChanges(); // уведомляем Angular о необходимости обновить представление

    }, 3500);
  }


  //загрузка инвентаря с бека
  loadInventory(): void {
    this.isLoading = true;

    // Если это СВОЙ профиль — передаём undefined (вызовет /api/user/inventory с JWT-токеном)
    // Если ЧУЖОЙ профиль — передаём targetUserId (вызовет /api/user/inventory/{id})
    const reqUserId = this.isOwnProfile ? undefined : (this.targetUserId ?? undefined);

    this.caseService.getInventory(reqUserId)
    .pipe(
      finalize(() => {
        // finalize сработает ВСЕГДА: и при 200 OK, и при ошибке (401, 500, CORS)
        this.isLoading = false; // отключаем индикатор загрузки
        this.cdr.detectChanges(); // уведомляем Angular о необходимости обновить представление
      })
    )
    .subscribe({
      next: (items) => {
        console.log('Загруженный инвентарь:', items);
        //защита если пришел null или не массив ставим пустой массив
        this.userItems = Array.isArray(items) ? items : [];
        this.cdr.detectChanges(); // уведомляем Angular о необходимости обновить представление
      },
      error: (err) => {
        console.error('Ошибка при загрузке инвентаря:', err);
      }
    });
  }
 
  //продажа предметов 
  onSell(inventoryId?: number): void{
    //защита продавать можно ток свои
    if (!inventoryId || !this.isOwnProfile) return;

    //находим предмет перед удалением чтоб узнать имя и цену для уведа 
    const targetItem = this.userItems.find((item) => item.inventoryId === inventoryId);

    const balanceBefore = this.authService.currentBalance();

    console.log(`%c[PROFILE_SELL START]`, 'color: #ff00ff; font-weight: bold;', {
      inventoryId,
      itemPrice: targetItem?.price,
      balanceBefore
    });

    this.caseService.sellItem(inventoryId).subscribe({
      next: (res) => {
        console.log(`%c[PROFILE_SELL SUCCESS]`, 'color: #00ff00; font-weight: bold;', {
          itemPrice: targetItem?.price,
          balanceBefore,
          serverNewBalance: res.newBalance,
          expectedBalance: balanceBefore + (targetItem?.price || 0)
        });


        //обновляеем signal баланса в AuthService 
        this.authService.currentBalance.set(res.newBalance);

        //обноввляем значение в localstorage
        localStorage.setItem('balance', res.newBalance.toString());

        //удаляем проданный предмет из массива userItems
        this.userItems = this.userItems.filter(item => item.inventoryId !== inventoryId);
        
        //уведомление о продаже шмотки
        const printText = targetItem?.price ? `${targetItem.price} $` : '';
        this.showToast(`Предмет продан. На мой баланс зачислено: ${printText}`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`%c[PROFILE_SELL ERROR]`, 'color: #ff0000; font-weight: bold;', err);
        alert(err.error?.message || 'Ошибка при продаже предмета');
      } 
    });
  }

  //вывод на акк
  onWithdraw(inventoryId?: number): void {
    //выводить можно ток свои предметы 
    if  (!inventoryId || !this.isOwnProfile) return;
    
    this.caseService.withdrawItem(inventoryId).subscribe({
      next: (res) => {
        //удаляем предмет из списка(т.к выведен)
        this.userItems = this.userItems.filter(item => item.inventoryId !== inventoryId);
        
        this.showToast(res.message || 'Предмет выведен на мой акк', 'success');
        this.cdr.detectChanges();
      },
      error: (err) =>  alert(err.error?.message || 'Ошибка при выводе предмета'),
    });
  }
  
}
