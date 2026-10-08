import { Component, OnInit, OnDestroy,ChangeDetectorRef, Renderer2 } from '@angular/core';
//ngIf ngFor...
import { CommonModule } from '@angular/common';
import {Router, RouterLink } from '@angular/router';
import { BattlePassService, BattlePassLevel } from '../../services/battle-pass.service';

import { CaseService, CaseModel } from '../../services/case';
import { AuthService } from '../../core/services/auth';


@Component({
  selector: 'app-battle-pass',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './battle-pass.html',
  styleUrls: ['./battle-pass.scss']
})
export class BattlePassComponent implements OnInit, OnDestroy {
 // Все кейсы из БД
  cases: CaseModel[] = [];
  //загрузка лвлов батлпасс
  battlePass: BattlePassLevel[] = [];

  //идет ли загрузка 
  isLoading = true;

  //ошибка
  errorMessage = '';

  claimingLevelId: number | null = null;



  //
  constructor (
    private bpService: BattlePassService, 
    private caseService: CaseService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private router: Router,
    private renderer: Renderer2
  ) {}

  //ngOnInit вызов когда компонент создается 
  //загрузка батллпаса
  ngOnInit(): void {
    this.loadBattlePass();
    this.loadCases();


    // Вешаем класс для Battle Pass на body
    this.renderer.addClass(document.body, 'bp-theme');

  }

  ngOnDestroy(): void {
    // Убираем класс при выходе из компонента
    this.renderer.removeClass(document.body, 'bp-theme');
  }

 




  //получаем бп с бекенда
  loadBattlePass(): void {
    //состояние загрузки 
    this.isLoading = true;

    //убираем старую ошибку
    this.errorMessage = '';

    //get запрос
    this.bpService.getBattlePass().subscribe({
      next: (data) => {
        console.log('Данные в Angular:', data);
        //сохраняем полученнывйц лвл 
        this.battlePass = data;

        //загрузка закончитлась 
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ошибка загрузки батлпасса',err);

        //сообщение юзеру
        this.errorMessage = 'чот не так не удалось загрузить батлпасс';

        this.isLoading = false;

        this.cdr.detectChanges();
      }
    });

  }

  //загрузка кейсов 
  loadCases(): void {
    this.caseService.getCases().subscribe({
      next: (data) => {
        console.log('Кейсы для Battle Pass:', data);

        this.cases = data;
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error('ошибка загрузки кейса:', err);
      }
    });
  }


  //найти кейс по id 
  getRewardCase(level: BattlePassLevel): CaseModel | undefined {
    if(level.rewardCaseId === null) {
      return undefined;
    }
    return this.cases.find(
      c => c.caseId === level.rewardCaseId
    );
  }




  //забрать награду лвла 
  claimReward(level: BattlePassLevel): void {
    //проверка регнут чел или нет 
    if(!this.authService.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }

    //если забрана то ничего
    //если квест не выполнен то ничего
    //если отправили запрос на какой-то лвл то не дает отправить на сторой

    if(level.isRewardClaimed || !level.isCompleted || this.claimingLevelId !== null) {
      return;
    }


    //запоминаем id лвлва котоырй ща забираю
    this.claimingLevelId = level.levelId;
    this.cdr.detectChanges();

    
    //post запрос /claim/{levelId}
    this.bpService.claimReward(level.levelId).subscribe({
      next: (res) => {
        if(res.success){
          //помечаем награду забранной
          level.isRewardClaimed = true;
          console.log(res.message);

          //обновляем баланс в шапке 
          if(res.battlePassBalance !== undefined) {
            this.authService.updateBpBalance(res.battlePassBalance);
          }
          //мб в будущем сделай шоб мейн баланс давали
          if(res.mainBalance !== undefined){
            this.authService.currentBalance.set(res.mainBalance);
            localStorage.setItem('balance', res.mainBalance.toString());
          }

        } else {
          console.warn(res.message);
        }
        //снимаем блокировку кнопки
        this.claimingLevelId = null;
        this.cdr.detectChanges();

      },
      error: (err) => {
        console.error('Ошибка получения наградыв бп',err)
        //разрешаю снова нажать на кнопку
        this.claimingLevelId = null;
        this.cdr.detectChanges();

      }
    });
  }

  //возвращаем % выполнения квеста 
  getProgressPercent(level: BattlePassLevel): number {
    //защита от деления на 0
    if(level.goalValue <= 0){
      return 0;
    }
    //считаем процент
    const percent = (level.currentProgress / level.goalValue) * 100;

    //нельзя стать больше 100%
    return Math.min(percent,100);
  }
  //текст прогресаа возвращает  3 / 5
  getProgressText(level: BattlePassLevel): string {
    return `${level.currentProgress} / ${level.goalValue}`;
  }

  //проверка есть ли у лвла какая-то награда
  hasReward(level: BattlePassLevel): boolean {
    return (
      level.rewardCurrency !== null ||
      level.rewardCaseId !== null ||
      level.rewardText !== null
    );
  }

  //возвращает текст кнопки
  getClaimButtonText(level: BattlePassLevel): string{
    //награда уже забрана
    if (!this.authService.currentUser()) {
      return 'АГА ПАПАУСЯ ввойди в акк';
    }

    if (level.isRewardClaimed) {
      return 'Забрал';
    }

    //не выполнли
    if(!level.isCompleted) {
      return 'Выполни меня';
    }

    //можжно получить
    return 'ЗАБЕРИ УЖЕ';
  }
  //проверка выполняется ли сейчас запрос для конкретного лвлваа
    isClaiming(level: BattlePassLevel): boolean {

    return this.claimingLevelId === level.levelId;
  }
}
