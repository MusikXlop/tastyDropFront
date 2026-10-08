//reg
import { Component,ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class RegisterComponent implements OnInit {
  userData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  //6ти значный  код подтверждения (переменная)
  confirmCode: string = '';

  //флаг переключение (false будет форма ввода данных, true форма ввода кода)
  isCodeSent: boolean = false;

  errorMessage: string='';

  //поле для сообщения шо код повторно отправлен 
  successMessage: string = '';

  //состояние отправки данных
  isLoading: boolean= false;

  //флаг для отслеживания когда юзер уже есть в бд 
  isUserAlreadyExists: boolean = false;


  showPassword: boolean = false;
  showConfirmPassword: boolean = false;


  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef){}


  ngOnInit(): void {
    //если перешли со страницы входа для ввода кода неподтвержденного акка
    this.route.queryParams.subscribe((params) => {
      if(params['email']) {
        this.userData.email = params['email'];
        this.isCodeSent = true; //сразу показываем форму ввода кода 
        this.cd.detectChanges();
      }
    });
  }


  //переключалка
  togglePasswordVisibility(): void{
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void{
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  //обработчик регистрации 
  onSubmit(): void {
    //проверка совпадения пароля и его подтверждение на клиенте
    if(this.userData.password !== this.userData.confirmPassword)
    {
      this.errorMessage = 'Пароли разные';
      return;
    }
    //состояние отправки данных
    this.isLoading = true;
    this.errorMessage='';

    //Сбрасываем плашку успеха при отправке
    this.successMessage = '';


    //сброс фгалов дубликака при новой попытке
    this.isUserAlreadyExists = false;

    //вызов метода register в AuthService
    this.authService
    .register({
      username: this.userData.username,
      email: this.userData.email,
      password: this.userData.password
    })
    .subscribe({
      next: (res) => {
        this.isLoading = false;
        // переключаемся на форму ввода кода
        this.isCodeSent = true;
        this.cd.detectChanges(); //принудительно обновлять шаблон(шоб была плашка)
      },
      error: (err) => {
        this.isLoading = false;

        const rawError = 
        err.error?.message || 
        err.error?.Message || 
        (typeof err.error === 'string' ? err.error : '');

        //если ошибка дубликата пользователей
        if (rawError.includes('already exists')) {
          this.isUserAlreadyExists = true;
          this.errorMessage = 'Пользователь с такой почтой, логином или юзернеймом уже зарегистрирован';
        } else {
          this.errorMessage = rawError || 'Ошибка при регистрации';
        }
         this.cd.detectChanges();
      },
    });
    
  }
  //  Отправка второй формы (Подтверждение кода)
  onConfirmCode(): void {
    if (!this.confirmCode || this.confirmCode.length !== 6) {
      this.errorMessage = 'Введите 6-значный код из письма от князя';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    //  Сбрасываем плашку успешной отправки кода 
    this.successMessage = '';

    this.authService.confirmEmail({
      email: this.userData.email,
      code: this.confirmCode
    }).subscribe({
      next: () =>  {
        this.isLoading = false;
        //после успешного ввода кода и получаения токена (кидаем в профайл)
        this.router.navigate(['/profile']);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 
          err.error?.message ||
          err.error?.Message || 
          'Неверный код (князь не доволен)';
        this.cd.detectChanges();
      },
    });
  }

  


  resendCode(): void {
    if(!this.userData.email) {
      this.errorMessage = 'Укажите почту для отправки кода';
      return;
    }

    //  просто переключаем на форму ввода кода
    this.isCodeSent = true;
    this.isUserAlreadyExists = false;
    this.errorMessage = '';
    this.successMessage = 'Введи код, который пришел тебе на почту';
    this.cd.detectChanges();

    
  }
  
}
