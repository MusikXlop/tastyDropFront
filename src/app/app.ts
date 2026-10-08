//Корневой компонент склеивает постоянный элемент (Шапку)
//  с изменяемыми страницами (через RouterOutlet).

import { Component } from '@angular/core';

//для отображение активного роутера
import { RouterOutlet } from '@angular/router';

//импорт наш создланный компонент шапки
import { HeaderComponent } from './components/header/header.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  
  //назва проекта
  title='tastyDrop-web'
}
