

/**
 * 检查缓存是否超出预设值
 */
function checkCache():boolean {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    var memUsed=Math.round(used * 100) / 100;
    if (memUsed>1536) {return false;} //内存占用超过1.5G 不缓存 nodejs 最大内存2G...
    return true
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

    // 将时间戳相减获得差值（毫秒数）
    var differ = timestamp1 - timestamp2

    /**
     * @desc 毫秒数除以1000就转为秒数
     * @desc 秒数除以60后取整，就是分钟（因为1分钟等于60秒）
     * @desc 秒数除以3600后取整，就是小时（因为1小时等于3600秒）
     * @desc 小时数除以24后取整，就是相差的天数
     */
    var day = differ / 1000 / 60 / 60 / 24

    return parseInt(day.toString())
}

/**
 * 将日期转成字符串格式 如：20220101120000
 * @param date 
 * @returns 
 */
function convertDatetoStr(date: Date): string {
    return date.toISOString().split('T')[0]
}


export default {
    checkCache,isSameDay,calc_day,convertDatetoStr

} as const;