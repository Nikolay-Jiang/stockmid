
/**
 * 将日期转成字符串格式 如：2022-01-01
 * @param date 
 * @returns 
 */
function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}

/**
 * 判断2个日期是否为同一天
 * @param d1 
 * @param d2 
 * @returns 
 */
function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

/**
 * 计算两个日期间相差多少天
 * @param timestamp1 
 * @param timestamp2 
 * @returns 
 */
function calc_day(timestamp1: number, timestamp2: number): number {
    var differ = timestamp1 - timestamp2
    var day = differ / 1000 / 60 / 60 / 24
    return parseInt(day.toString())
}

/**
 * 检查缓存是否超出预设值
 */
function checkCache():boolean {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    var memUsed=Math.round(used * 100) / 100;
    if (memUsed>2536) {return false;}
    return true
}


export default {
    convertDatetoStr,isSameDay,calc_day,checkCache
} as const;
