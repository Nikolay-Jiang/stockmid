import { Request } from 'express';
import { ParamMissingError } from '@shared/errors';

/**
 * 验证参数是否存在
 * @param param 要验证的参数值
 * @param paramName 参数名称（用于错误消息）
 * @throws {ParamMissingError} 如果参数为undefined或空字符串
 */
export function validateParamExists(param: string, paramName: string): void {
    if (param === undefined || param === "") {
        throw new ParamMissingError();
    }
}

/**
 * 验证日期参数是否存在
 * @param dateParam 日期参数值
 * @throws {ParamMissingError} 如果参数为undefined或空字符串
 */
export function validateDateParam(dateParam: string): void {
    validateParamExists(dateParam, "date");
}

/**
 * 解析数值参数，提供默认值
 * @param param 数值参数字符串
 * @param defaultValue 默认值，默认为0.4
 * @returns 解析后的数值，如果解析失败则返回默认值
 */
export function parseNumberParam(param: string | undefined, defaultValue: number = 0.4): number {
    if (!param || param === "") {
        return defaultValue;
    }
    const num = Number(param);
    return isNaN(num) ? defaultValue : num;
}

/**
 * 解析日期字符串为Date对象
 * @param dateString 日期字符串
 * @returns Date对象
 * @throws {Error} 如果日期字符串无效
 */
export function parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`);
    }
    return date;
}

/**
 * 设置交易时间（8:00:00）
 * @param date 原始日期
 * @returns 设置交易时间后的新Date对象
 */
export function setTradingTime(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(8, 0, 0, 0);
    return newDate;
}

/**
 * 获取过去N天的日期
 * @param date 基准日期
 * @param days 过去的天数
 * @returns 过去N天的Date对象
 */
export function getPastDate(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate;
}

/**
 * 检查是否为周末
 * @param date 要检查的日期
 * @returns 如果是周六或周日返回true，否则返回false
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 6 || day === 0; // 6=周六, 0=周日
}

/**
 * 预测查询参数接口
 */
export interface PredictQueryParams {
    startDate: Date;
    endDate?: Date;
    stockCode?: string;
    evalNumber?: number;
    evalRate?: number;
}

/**
 * 解析预测查询参数
 * @param req Express请求对象
 * @returns 解析后的参数对象
 */
export function parsePredictQueryParams(req: Request): PredictQueryParams {
    const { startday, endday, stockcode, evalnumber, evelrate } = req.params;
    
    validateDateParam(startday);
    
    const startDate = parseDate(startday);
    const endDate = endday ? parseDate(endday) : undefined;
    const evalNumber = evalnumber ? parseNumberParam(evalnumber) : undefined;
    const evalRate = evelrate ? parseNumberParam(evelrate) : undefined;
    
    return {
        startDate,
        endDate,
        stockCode: stockcode,
        evalNumber,
        evalRate
    };
}

/**
 * 回测参数接口
 */
export interface BacktestParams {
    startDate: Date;
    evalNumber: number;
    withTradingTime?: boolean;
}

/**
 * 解析回测参数
 * @param req Express请求对象
 * @param withTradingTime 是否设置交易时间，默认为true
 * @returns 解析后的回测参数
 */
export function parseBacktestParams(req: Request, withTradingTime: boolean = true): BacktestParams {
    const { startday, evalnumber } = req.params;
    
    validateDateParam(startday);
    
    const startDate = parseDate(startday);
    const evalNumber = parseNumberParam(evalnumber);
    
    if (withTradingTime) {
        startDate.setHours(8, 0, 0, 0);
    }
    
    return { startDate, evalNumber };
}