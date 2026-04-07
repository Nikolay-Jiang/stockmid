/**
 * 交易模块业务常量 — 从 simtrade-service.ts 和 simtrade-router.ts 提取
 */

// RSI 阈值
export const RSI_THRESHOLDS = {
    OVERSOLD: 20,           // RSI7 < 20 → 超卖，跳过
    WEAK_ZONE: 30,          // RSI7 < 30 → W候选区
    DUAL_STRONG: 60,        // RSI7/14 均 >= 60 → 双强区
    STRONG: 70,             // RSI >= 70 → 强势区
    DEFAULT_AVG: 21,        // isW 默认 RSI 均线周期
} as const;

// 价格阈值
export const PRICE_THRESHOLDS = {
    MIN_W_CANDIDATE: 15,    // W候选最低股价
    MIN_YZM_CANDIDATE: 12,  // YZM候选最低股价 (> 12)
    MAX_DOUBLE_RISE: 200,   // 双升最高股价 (< 200)
} as const;

// 布林带阈值
export const BOLLINGER_THRESHOLDS = {
    MAX_BB: 0.55,           // W候选最大BB值
    MAX_WIDTH: 0.22,        // W候选最大WIDTH值
} as const;

// 时间窗口（天数）
export const TIME_WINDOWS = {
    W_LOOKBACK_DAYS: 21,    // W模式回溯天数
    NOTICE_CHECK_DAYS: 30,  // 关注函/问询函检查天数
} as const;

// W检测宽松参数（用于findYZM内部的W二次检测）
export const W_DETECT_LOOSE = {
    RSI_DECIDE: 30,         // 宽松 iRSIDecide
    RSI_AVG: 29,            // 宽松 RSIavg
} as const;

// 模拟交易组合参数
export const PORTFOLIO_DEFAULTS = {
    INIT_MONEY: 100000,     // 初始资金（10万）
    INIT_VOL: 5000,         // 初始持仓股数
    ONCE_VOL: 1000,         // 每次交易股数
} as const;
