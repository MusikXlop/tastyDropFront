//login
import { Component, ChangeDetectorRef, OnInit } from '@angular/core'; // объявление класа



//ngif ngfor
import { CommonModule } from '@angular/common';

//для двухсторонней работы(банан)
import { FormsModule } from '@angular/forms';

// Router для программных редиректов, RouterModule
//  для ссылки routerLink в шаблоне
//ActivatedRoute для чтение queryParams
import { Router, RouterModule, ActivatedRoute } from '@angular/router';


//сервис для работы с авторизацией и запролсами к API
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
  // Объект модели формы
  // куда через [(ngModel)] записываются введенные email и пароль
  credentials = {
    email: '',
    password: ''
  };



  //флаг для переключение режимой входа
  //false обычный вход
  //true вход с восстаовлением пароля
  isForgotPasswordMode: boolean = false;

  //данные сброса пароля
  resetData = {
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  };


  /*флаг шагов внутри сброса пароля
  false ввод почты и кнопка высытлай код
  true ввод кода  нового пароля и подтверждения*/
  isResetCodeSent: boolean = false;

  //текст ошибки и успеха
  //текст ошибки (если равен '', плашка ошибки скрыта)
  errorMessage: string='';
  successMessage: string = '';


  //флаг состояния запроса ( блокирует кнопку и меняет текст на ЗАГРУЗКАмб)
  isLoading: boolean = false;


  //флаг неподтвержденной почты 
  requiresConfirmation: boolean = false;

  //внедряем сервиси черз конструктор компонента 
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ){}


  ngOnInit(): void {
    // Автозаполнение email если пришли со страницы регистрации или подтверждения
    //подпимсываем на изменения get параметров  URL
    this.route.queryParams.subscribe((params) => {
      if(params['email']) {
        //если в url передан email подставляем его срабу в обе формы 
        this.credentials.email = params['email'];
        this.resetData.email = params['email'];
      }
    });
  }


  //метод чтоб снятьь автоаполнение в браузере когда перехожу на 
  //забыл пароль
  removeReadOnly(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      target.removeAttribute('readonly');
    }
  }


  //переключение режима ЗАБЫЛ ПАРОЛЬ
  //true откыть сброс пароля
  //false вернуться ко входу
  toggleForgotPassword(show: boolean): void {
    this.isForgotPasswordMode = show; //меняем режим 
    this.errorMessage = ''; //очищаем ошибки
    this.successMessage = ''; //очищаем успехи
    //сбрасываем шаги внутри сброса пароля на вернуться к входу
    this.isResetCodeSent = false; 


    // Очищаем данные сброса, чтобы браузер или прошлый ввод не подставляли мусор
    this.resetData.code = '';
    this.resetData.newPassword = '';
    this.resetData.confirmPassword = '';

    //если переходим в восстановление и почта была уже введена при входе то копируем ее
    if(show && this.credentials.email) {
      this.resetData.email = this.credentials.email;
    }
  }



  //метод вызываемый при отправке формы
  onSubmit(): void {
    //если хотя бы одно поле пустое
    if(!this.credentials.email || !this.credentials.password)
    {
      this.errorMessage='АЛО ЗАПОЛНИ ВСЕ ПОЛЯ';
      //записываем ошибку  и прерываем выполнение
      return;
    }

    //состояние загрузки
    this.isLoading = true;
    
    //очищаем старые ошибки пред новым запросом
    this.errorMessage='';

    //сбрасываем флаг при новой попытке входа 
    this.requiresConfirmation = false;


    // Вызываем метод login из сервиса и подписываемся на Observable-ответ от бэкенда
    this.authService.login(this.credentials).subscribe({
      next: () => {
        //если все норм
        this.isLoading = false;
        //вырубае загрузку 
        this.router.navigate(['/profile']);
        //перенаправляем на страницу профиля
        this.cd.detectChanges();
      },

      error: (err) => {
        //при ошибке
        this.isLoading = false;

        //проверка если сервер просит подтвержить почту
        if(
          err.error?.requiresConfirmation ||
          err.error?.RequiresConfirmation
        ) {
            this.requiresConfirmation = true;
            this.errorMessage = 
            err.error?.message ||
            err.error?.Message ||
            'Введи снова код из письма ща тебя покажу куда жмать';
          } else {
            //вырубаем загрузку
            this.errorMessage =
            err.error?.message || 'Неверна почта или пароль';
          }
        this.cd.detectChanges(); 
      },
    });
  }

  //сброс пароля  запрос6ти знач кода на почту
  onRequestResetCode(): void {
    //проверка ввел ли тип почту
    if(!this.resetData.email) {
      this.errorMessage = 'Введи почту БЫСТРЕЕ';
      return;
    }

    ///грузимся дальщ
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    //вызов метода сервиса
    this.authService.forgotPassword(this.resetData.email).subscribe({
      next: (res) => {
        this.isLoading = false; 
        this.isResetCodeSent = true; //переключаем  true ввод кода  нового пароля и подтверждения
        // Очищаем код на случай переповтора
        this.resetData.code = '';
        this.resetData.newPassword = '';
        this.resetData.confirmPassword = '';
        this.successMessage = res.message || 'Код выслан на рандом почту ИЩИ';
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false; 
        this.errorMessage = err.error?.message || 'Ошибка при запросе кода';
        this.cd.detectChanges();
      }
    });

  }

  //сброс пароля проверка введеного кода и сохранение нового пароля
  onSubmitNewPassword(): void {
    //проверка заполнения всех 3 полей на "true ввод кода  нового пароля и подтверждения"
    if (!this.resetData.code || !this.resetData.newPassword || !this.resetData.confirmPassword) {
      this.errorMessage = 'Заполни все поля РАК ';
      return;
    }

    //проверка совпадения нового пароля и подтверждения
    if(this.resetData.newPassword !== this.resetData.confirmPassword) {
      this.errorMessage = 'Пароли не совпадают';
      return;
    }

    //проверка длинны кода подтверждения ровно 6 над
    if(this.resetData.code.length !== 6) {
      this.errorMessage = 'РОВНО ЭТ ЭТ РОВНО СЫНОК РОВНО 6 ЦИФР НАД';
      return;
    }


    //грузимся дальщ
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    //отправка dto с почтой кодом и нью паролем на бек 
    this.authService.resetPassword({
      email: this.resetData.email,
      code: this.resetData.code,
      newPassword: this.resetData.newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Изменил пароль ЙОУ';
        

        //флома ждя входа (подставляем почту и очищаем пароль)
        this.credentials.email = this.resetData.email;
        this.credentials.password = '';

        //через 1.5 сек автоматически перевеодим юзера обратно на экран входа
        setTimeout(() => {
          this.toggleForgotPassword(false); //бек ту форма входа 
          this.cd.detectChanges();
        },1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.error?.Message || 'Ошибка при сбросе пароля';
        this.cd.detectChanges();
      }
    });
  }


  //метод для редиректа на подтверждени по кнопке 
  goToConfirmation(): void {
    this.router.navigate(['/register'], {
      queryParams: {email: this.credentials.email },
    });
  }
}
