//Связывает логику AuthService со сгенерированной HTML-шапкой

import { Component } from '@angular/core';

// ngIf ngfor
import { CommonModule } from '@angular/common';

//переход по сыллкам без перезагрузки страницы 
import { Route, Router, RouterLink,RouterModule } from '@angular/router';

//импортируем сервис авторзации
import { AuthService } from '../../core/services/auth';

//компонент пополнения баланса
import { TopUpModalComponent } from '../top-up-modal/top-up-modal';

import { LiveFeedService } from '../../services/live-feed.service';

@Component({
  selector: 'app-header',
  standalone: true, // указываем компонент не требует NgModule

  imports: [CommonModule,RouterLink, 
            RouterModule,TopUpModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {

  //состояне открытости меюн пррофиля
  isDropdownOpen = false;

  //состояния открытости модалки (пополнения баланса)
  isTopUpOpen = false;
  
  // Делаем authService публичным (public), 
  // чтобы обратиться к его сигналам прямиком из HTML
  //(внедряем сервис авторазции и роутер через конструктор)
  constructor(public authService: AuthService, 
    public liveFeedService: LiveFeedService,
    private router: Router) {
      console.log('LIVE FEED:', this.liveFeedService.drops());
    }


  //метод для переключения состояния выпадающего меню(открыть закрыт)
  toggleDropDown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  //метод для принудительного закрытия меню( к примеру при клике на ссылку)
  closeDropDown(): void {
    this.isDropdownOpen = false;
  }

  //управлене модалкой пополнения
  openTopUp(): void{
    this.isTopUpOpen = true;
  }
  
  closeTopUp(): void{
    this.isTopUpOpen = false;
  }
   
  //переход в профайл пользователя при клике 
  goToUserProfile(userId: number) {
    console.log('Кликнули по userId:', userId);
    this.router.navigate(['/profile', userId]);
  }

    // Переход на страницу апгрейда
    goToUpgrade() {
      this.router.navigate(['/upgrade']);
    }

  //переход на страницу кейса при клике
  goToCase(caseId: number) {
    if(caseId) {
      this.router.navigate(['/case', caseId]);
    }
  }

  //в мины
  goToMines() {
    this.router.navigate(['/mines']);
  }


  // Общий клик по карточке
  onDropClick(drop: any) {
    if (drop.gameType === 'Mines') {
      this.goToMines();
    } else if (drop.caseId) {
      this.goToCase(drop.caseId);
    } else {
      this.goToUpgrade();
    }
  }



  //обработчик клика по кнопке выйти
  onLogout(): void {
    //вызываем очистку сессии в сервисе
    this.authService.logout();
    this.closeDropDown(); //закрывать выпадающие окно
    this.router.navigate(['/']); //переправка на меню
  }

  


}
