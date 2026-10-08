export interface MinesGameConfig {
    //размер поля 
    gridSize: number;
    //колво мин 
    minesCount: number;
    //сумма ставки
    betAmount: number;
}

export interface MinesCell {
    //индекс клетки
    index: number
    //открыта ли клетка
    isRevealed: boolean;
    //открыта ли мина в клетке
    isMine: boolean;
    //множитель вина х1 х2 х3
}

export interface StartMinesResponse {
    gameId: number; //айди игры
    betAmount: number; //ставка
    gridSize: number;
    minesCount: number; //колво мин
    currentMultiplier: number; //текущий множитель
    status: string;
    newBalance: number;
}

export interface RevealCellResponse{
    gameId: number;
    status: string;
    isHitMine: boolean;
    currentMultiplier: number;
    newBalance: number;
    revealedCells: number[];
    minePositions?: number[];
    winAmount: number;
}
export interface MinesGameStatusDto {
    gameId: number;
    betAmount: number;
    minesCount: number;
    gridSize: number;
    currentMultiplier: number;
    status: string;
    newBalance: number;
    revealedCells: number[];
    isHitMine: boolean;
    winAmount: number;
    minePositions?: number[];
}