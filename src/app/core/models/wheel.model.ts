//для отправки ставик на сервак
export interface WheelSpinDto {
    betAmount: number; // сумма ставки
    targetColor: string; //выбранный цвет
}

//для результата спина
export interface WheelResultDto {
    gameId: number;              // id игры
    betAmount: number;           // ставка
    targetColor: string;         // выбранный цвет
    wonColor: string;            // выпавший цвет
    winningSegmentIndex: number; // индекс сектора
    multiplier: number;          // множитель
    winAmount: number;           // сумма выигрыша
    newBalance: number;          // новый баланс игрока
}

//для цвета
export interface WheelColorOption {
    key: string; //ключ цвета
    label: string; //попись для кнопк
    multiplier: number; // множитель
    iconUrl: string
    colorHex: string;   //  цвет для отображения
}