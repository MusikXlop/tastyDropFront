import { Routes } from '@angular/router';
//главная страница при входе на сайт
import { HomeComponent } from './pages/home/home.component';

// страница логина
import { LoginComponent } from './pages/login/login';

//рега
import { RegisterComponent } from './pages/register/register';
import { MinesComponent } from './pages/mines/mines.component'; 
import { ProfileComponent } from './components/profile/profile';

//защита маршрутов
import { authGuard } from './core/guards/auth-guard';

import { CaseDetailsComponent } from './pages/case-details/case-details.component';

import { UpgradeComponent } from './pages/upgrade/upgrade';

import { BattlePassComponent } from './pages/battle-pass/battle-pass';

import { WheelComponent } from './pages/wheel/wheel';

import { CrashComponent } from './pages/crash/crash';


// Объявляем и экспортируем конфигурацию маршрутов
export const routes: Routes = [

  //по дефолт адресу будет главная страница
  { path: '', component: HomeComponent, pathMatch: 'full' },

  //по адресу /login
  { path: 'login', component: LoginComponent },


  //для апргрейда 
  {path: 'upgrade', component: UpgradeComponent},


  //для батлпасса 
  { path: 'battle-pass', component: BattlePassComponent},


  //по адресу /login
  { path: 'register', component: RegisterComponent },
  
  //по адресу в кейсике
  {path: 'case/:id', component: CaseDetailsComponent},


  //свjq профайл(над авторизацию)
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },

  //профайл другова юзера
  {
    path: 'profile/:id',
    component: ProfileComponent
  },


  {
    path: 'mines', component: MinesComponent
  },


  {
    path: 'wheel', component: WheelComponent
  },


  {
    path: 'crash', component: CrashComponent
  },

  {path: '**', redirectTo: ''}
];
