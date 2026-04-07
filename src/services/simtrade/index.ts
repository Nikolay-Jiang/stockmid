// Barrel module - types, re-exports, and default export

// ============================================================
// Types/Enums/Classes
// ============================================================

//涨跌类型
export enum rdType {
    doubleRise = "双升",
    wpatton = "W",
    YZMpatton = "YZM",
    YZMsmi1="YZM-sim1",
    doubleDown = "双降",
    mpatton = "M",
    unknow = "未知",

}

export enum stockOP {
    buy,
    add,
    hold,
    reduce,
    sell,
}

export enum resultStatus { good, bad }

export enum dayStatus { rise, stop, hold, down }

export class simLog {
    reportday!: Date;
    vol: number = -1;
    price: number = -1;
    cash: number = -1;
    status: number = 0;
    memo: string = "";
}

export class wresult {
    stockcode: string = "";
    Type: rdType = rdType.unknow;
    rsi7: number = 0;
    rsi14: number = 0;
    price: number = -1;
    MA: number = -1;
    bollDown: number = -1;
    bb: number = -1;
    width: number = -1;
    eval: string = "";
    evalprice: number = 0;
    evalrate: number = 0;
}

export interface EvalResultBase {
    enddate: Date;
    tempCount: number;
    filterCount: number;
    iCountGood: number;
    tempRate: string;
    findresults: wresult[];
}

// ============================================================
// Re-exports from submodules (named exports for mutable state)
// ============================================================
export { isMpatton, isWpatton, iCountW, wStr, txtOP } from './calculator';
export { validTremor, isUnderLow, isRecentHigh, isRecentLow } from './data-prep';

// ============================================================
// Import for default export assembly
// ============================================================
import { isAdd, isReduce, isM, isW } from './calculator';
import { isRecentHigh, isRecentLow, isNegativeEvent, moneyrule1, findDoubleRise } from './data-prep';
import { findW, findYZM } from './signal-generator';
import { runStatistics } from './portfolio-state';
import { simulateFromPredictions, evaluateFindW, evaluateFindYZM, findAndSaveYZMOnline, findAndSaveYZMByDay, findAndSaveWOnline } from './portfolio-workflows';

// Default export matches original simtrade-service.ts API
export default {
    isAdd,
    isReduce,
    isM, isNegativeEvent,
    isW, findYZM,
    isRecentHigh,
    isRecentLow,
    findW, findDoubleRise,
    // Extracted from router (T13)
    simulateFromPredictions,
    runStatistics,
    evaluateFindW,
    evaluateFindYZM,
    findAndSaveYZMOnline,
    findAndSaveYZMByDay,
    findAndSaveWOnline,
    moneyrule1,
} as const;
