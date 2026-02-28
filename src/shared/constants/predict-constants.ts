/**
 * 预测模块业务常量
 */

// 业务常量
export const PREDICT_CONSTANTS = {
    // 默认评估值
    DEFAULT_EVAL_NUMBER: 0.4,
    DEFAULT_EVAL_RATE: 0.5,
    
    // 日期相关
    PAST_DAYS_FOR_CODE2: 60,
    TRADING_HOURS: { hour: 8, minute: 0, second: 0, millisecond: 0 },
    WEEKEND_DAYS: [0, 6] as const, // 0=周日, 6=周六
    
    // SIM1筛选阈值
    SIM1_THRESHOLDS: {
        MIN_RSI_DIFF: 10,
        MAX_RSI7: 90,
        MIN_PRICE: 15
    },
    
    // 股票代码前缀
    STOCK_CODE_PREFIXES: {
        SH: "sh",
        SZ: "sz"
    },
    
    // 预测类型
    PREDICT_TYPES: {
        W: "W",
        YZM: "YZM"
    } as const
} as const;

// 魔法数字常量（用于业务逻辑中的硬编码值）
export const MAGIC_NUMBERS = {
    // 收益计算
    MINI_BENEFIT_INIT: 100,
    
    // W算法阈值
    W_THRESHOLDS: {
        LOW: 5,
        MEDIUM: 15
    },
    
    // YZM算法阈值
    YZM_THRESHOLDS: {
        LOW: 80,
        MEDIUM: 100,
        HIGH: 200
    },
    
    // 回测相关
    BACKTEST: {
        DEFAULT_RATE: 0.5,
        MIN_EVAL_PRICE: 0.4
    },
    
    // 统计分析
    STATISTICS: {
        PERCENTAGE_MULTIPLIER: 100,
        DECIMAL_PLACES: 2
    }
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
    INVALID_DATE: "Invalid date parameter",
    PARAM_MISSING: "Required parameter is missing",
    SERVICE_ERROR: "Service error occurred",
    VALIDATION_ERROR: "Validation error"
} as const;

// 响应消息常量
export const RESPONSE_MESSAGES = {
    SUCCESS: "Success",
    BACKTEST_COMPLETE: "Backtest completed successfully",
    MONTHLY_BACKTEST_COMPLETE: "Monthly backtest completed successfully"
} as const;