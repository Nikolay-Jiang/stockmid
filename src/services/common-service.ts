

/**
 * 检查缓存是否超出预设值
 */
function checkCache():boolean {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    var memUsed=Math.round(used * 100) / 100;

    if (memUsed>3000) {return false;} //内存占用超过3G 不缓存
    return true
}


export default {
    checkCache,

} as const;