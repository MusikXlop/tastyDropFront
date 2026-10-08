export interface CrashStartDto
{
    betAmount: number; // ставка
}

export interface CrashCashoutDto
{
    gameId: number; //айди игры
    targetMultiplier: number; //выбранный множитель
}

export interface CrashGameStatusDto
{
    gameId: number; //айди игры
    betAmount: number; // ставка
    crashPoint?: number | null; // точка краша
    currentMultiplier: number; // текущий множитель
    status: 'InGame' | 'Won' | 'Crashed'; // статус игры
    newBalance: number; // новый баланс
    winAmount: number; // сумма выигрыша
}