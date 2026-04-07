import analysisService from '@services/analysis-service';
import dayrptService from '@services/dayrpt-service';
import tencentService from '@services/tencentstock-service';

type SimtradeModule = typeof import('@services/simtrade');

function loadSimtrade(): SimtradeModule {
    Object.keys(require.cache).forEach(key => {
        if (key.includes('simtrade')) delete require.cache[key];
    });
    return require('@services/simtrade') as SimtradeModule;
}

function makeDayRpt(args: {
    code?: string;
    day: Date;
    close: number;
    open?: number;
    max?: number;
    min?: number;
    avg?: number;
    vol?: number;
    tradePrice?: number;
    rsi7?: number;
    rsi14?: number;
    ma?: number;
    bollDown?: number;
    bollUP?: number;
    width?: number;
    bb?: number;
    rate?: number;
    ratePrice?: number;
    memo?: string;
}): any {
    const close = args.close;
    const min = args.min ?? close - 1;
    const max = args.max ?? close + 1;
    const avg = args.avg ?? close;
    const vol = args.vol ?? 100;
    return {
        StockCode: args.code ?? 'sz000001',
        ReportDay: args.day,
        TodayOpenPrice: args.open ?? close,
        TodayMaxPrice: max,
        TodayMinPrice: min,
        TodayClosePrice: close,
        Rate: args.rate ?? 0.05,
        RatePrice: args.ratePrice ?? (max - min),
        Memo: args.memo ?? '',
        TradingVol: vol,
        TradingPrice: args.tradePrice ?? avg * vol,
        TradingPriceAvg: avg,
        MA: args.ma ?? close,
        bollUP: args.bollUP ?? close + 2,
        bollDown: args.bollDown ?? close - 2,
        RSI7: args.rsi7 ?? 50,
        RSI14: args.rsi14 ?? 50,
        WIDTH: args.width ?? 0.2,
        BB: args.bb ?? 0.5,
    };
}

function makeSeries(
    values: Array<{ close: number; rsi7: number; rsi14: number; max?: number; avg?: number; vol?: number }>,
    code = 'sz000001',
): any[] {
    return values.map((value, index) => makeDayRpt({
        code,
        day: new Date(2024, 0, index + 1, 8),
        close: value.close,
        max: value.max ?? value.close + 1,
        avg: value.avg ?? value.close,
        vol: value.vol ?? 100,
        rsi7: value.rsi7,
        rsi14: value.rsi14,
    }));
}

function makeExpectedResult(args: {
    stockcode: string;
    type: string;
    rsi7: number;
    rsi14: number;
    price: number;
    ma: number;
    bollDown: number;
    eval?: string;
}): Record<string, number | string> {
    return {
        stockcode: args.stockcode,
        Type: args.type,
        rsi7: args.rsi7,
        rsi14: args.rsi14,
        price: args.price,
        MA: args.ma,
        bollDown: args.bollDown,
        bb: -1,
        width: -1,
        eval: args.eval ?? '',
        evalprice: 0,
        evalrate: 0,
    };
}

describe('simtrade-service isAdd()', () => {
    it('returns true for a double-rise fixture.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 30, rsi14: 25 },
            { close: 11, rsi7: 35, rsi14: 30 },
            { close: 12, rsi7: 40, rsi14: 35 },
        ]);

        const result = await simtradeModule.default.isAdd(dayrpts, 2);

        expect(result).toBeTrue();
        expect(simtradeModule.txtOP).toBe('双升');
    });

    it('returns false when RSI7 is below 20.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 25, rsi14: 22 },
            { close: 9.5, rsi7: 22, rsi14: 21 },
            { close: 9, rsi7: 19, rsi14: 18 },
        ]);

        const result = await simtradeModule.default.isAdd(dayrpts, 2);

        expect(result).toBeFalse();
    });

    it('returns true and marks the W-channel fixture.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 13, rsi7: 25, rsi14: 30 },
            { close: 12, rsi7: 10, rsi14: 18 },
            { close: 13, rsi7: 28, rsi14: 24 },
            { close: 12.4, rsi7: 15, rsi14: 19 },
            { close: 12.7, rsi7: 18, rsi14: 20 },
            { close: 13.2, rsi7: 31, rsi14: 26 },
        ]);

        const result = await simtradeModule.default.isAdd(dayrpts, 5);

        expect(result).toBeTrue();
        expect(simtradeModule.txtOP).toBe('W 通道');
        expect(simtradeModule.wStr).toBe('|10,28,15');
    });
});

describe('simtrade-service isReduce()', () => {
    it('returns true for a recent-high double-rise fixture.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 45, rsi14: 44, max: 10 },
            { close: 11, rsi7: 52, rsi14: 51, max: 11 },
            { close: 12, rsi7: 55, rsi14: 54, max: 12 },
        ]);

        const result = simtradeModule.default.isReduce(dayrpts, 2);

        expect(result).toBeTrue();
        expect(simtradeModule.txtOP).toBe('双升 RSI7 强 3天内高位');
    });

    it('returns false when RSI7 is below 20.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 25, rsi14: 30 },
            { close: 9, rsi7: 19, rsi14: 25 },
        ]);

        const result = simtradeModule.default.isReduce(dayrpts, 1);

        expect(result).toBeFalse();
    });

    it('returns false for the RSI7 crossover guard fixture.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 49, rsi14: 52 },
            { close: 10.5, rsi7: 55, rsi14: 50 },
        ]);

        const result = simtradeModule.default.isReduce(dayrpts, 1);

        expect(result).toBeFalse();
    });

    it('returns true for the first M-pattern reduce fixture.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 40, rsi14: 42 },
            { close: 12, rsi7: 60, rsi14: 58 },
            { close: 11, rsi7: 45, rsi14: 47 },
            { close: 11.5, rsi7: 55, rsi14: 53 },
            { close: 10.8, rsi7: 58, rsi14: 54 },
            { close: 10.3, rsi7: 50, rsi14: 49 },
        ]);

        const result = simtradeModule.default.isReduce(dayrpts, 5);

        expect(result).toBeTrue();
        expect(simtradeModule.txtOP).toBe('M 右侧第一次出现');
    });
});

describe('simtrade-service isM()', () => {
    it('returns true for a valid M fixture.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 40, rsi14: 42 },
            { close: 12, rsi7: 60, rsi14: 58 },
            { close: 11, rsi7: 45, rsi14: 46 },
            { close: 11.7, rsi7: 50, rsi14: 51 },
            { close: 10.9, rsi7: 35, rsi14: 40 },
            { close: 10.4, rsi7: 30, rsi14: 36 },
        ]);

        expect(simtradeModule.default.isM(dayrpts, 5)).toBeTrue();
    });

    it('returns false when the two peaks are adjacent.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 40, rsi14: 42 },
            { close: 12, rsi7: 60, rsi14: 58 },
            { close: 11.5, rsi7: 55, rsi14: 54 },
            { close: 11, rsi7: 45, rsi14: 47 },
            { close: 10.5, rsi7: 35, rsi14: 40 },
            { close: 10, rsi7: 30, rsi14: 36 },
        ]);

        expect(simtradeModule.default.isM(dayrpts, 5)).toBeFalse();
    });

    it('returns false when fewer than five prior rows exist.', () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 10, rsi7: 40, rsi14: 42 },
            { close: 12, rsi7: 60, rsi14: 58 },
            { close: 11, rsi7: 45, rsi14: 46 },
            { close: 11.8, rsi7: 55, rsi14: 53 },
            { close: 10.6, rsi7: 30, rsi14: 38 },
        ]);

        expect(simtradeModule.default.isM(dayrpts, 4)).toBeFalse();
    });
});

describe('simtrade-service isW()', () => {
    it('returns true for a valid W fixture.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 13, rsi7: 25, rsi14: 30 },
            { close: 12, rsi7: 10, rsi14: 18 },
            { close: 13, rsi7: 28, rsi14: 24 },
            { close: 12.4, rsi7: 15, rsi14: 19 },
            { close: 12.7, rsi7: 18, rsi14: 20 },
            { close: 13.2, rsi7: 31, rsi14: 26 },
        ]);

        const result = await simtradeModule.default.isW(dayrpts, 5, 20);

        expect(result).toBeTrue();
        expect(simtradeModule.wStr).toBe('|10,28,15');
    });

    it('returns false when the minima are adjacent.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 13, rsi7: 25, rsi14: 30 },
            { close: 12, rsi7: 10, rsi14: 18 },
            { close: 12.2, rsi7: 15, rsi14: 19 },
            { close: 13, rsi7: 28, rsi14: 24 },
            { close: 12.7, rsi7: 18, rsi14: 20 },
            { close: 13.1, rsi7: 31, rsi14: 26 },
        ]);

        const result = await simtradeModule.default.isW(dayrpts, 5, 20);

        expect(result).toBeFalse();
    });

    it('returns false when the last three-RSI average is exactly 21.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 13, rsi7: 25, rsi14: 30 },
            { close: 12, rsi7: 10, rsi14: 18 },
            { close: 13, rsi7: 28, rsi14: 24 },
            { close: 12.4, rsi7: 15, rsi14: 19 },
            { close: 12.7, rsi7: 18, rsi14: 20 },
            { close: 13, rsi7: 30, rsi14: 26 },
        ]);

        const result = await simtradeModule.default.isW(dayrpts, 5, 20);

        expect(result).toBeFalse();
    });

    it('returns false when fewer than five prior rows exist.', async () => {
        const simtradeModule = loadSimtrade();
        const dayrpts = makeSeries([
            { close: 13, rsi7: 25, rsi14: 30 },
            { close: 12, rsi7: 10, rsi14: 18 },
            { close: 13, rsi7: 28, rsi14: 24 },
            { close: 12.4, rsi7: 15, rsi14: 19 },
            { close: 12.7, rsi7: 18, rsi14: 20 },
        ]);

        const result = await simtradeModule.default.isW(dayrpts, 4, 20);

        expect(result).toBeFalse();
    });
});

describe('simtrade-service findYZM()', () => {
    it('returns the expected YZM snapshot for a rising double-strong fixture.', async () => {
        const simtradeModule = loadSimtrade();
        const endDate = new Date(2024, 0, 9, 8);
        const candidate = makeDayRpt({
            code: 'sz000001',
            day: new Date(2024, 0, 8, 8),
            close: 13,
            avg: 13,
            vol: 190,
            rsi7: 65,
            rsi14: 62,
            ma: 12,
            bollDown: 10,
        });
        const history = [
            candidate,
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 5, 8), close: 12, avg: 12, vol: 100, rsi7: 58, rsi14: 56 }),
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 4, 8), close: 11, avg: 11, vol: 90, rsi7: 51, rsi14: 50 }),
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 3, 8), close: 10, avg: 10, vol: 85, rsi7: 45, rsi14: 44 }),
        ];
        spyOn(tencentService, 'isHoliday').and.callFake(async () => false);
        spyOn(dayrptService, 'getDayrptByReportDay').and.returnValue(Promise.resolve([candidate]));
        spyOn(dayrptService, 'getDayrptByReportDay2').and.returnValue(Promise.resolve(history));

        const result = await simtradeModule.default.findYZM(endDate);

        expect(result).toEqual([
            jasmine.objectContaining(makeExpectedResult({
                stockcode: 'sz000001',
                type: 'YZM',
                rsi7: 65,
                rsi14: 62,
                price: 13,
                ma: 12,
                bollDown: 10,
                eval: '3|量价齐升|双强|双6',
            })),
        ]);
    });

    it('returns an empty array when the end date is a holiday.', async () => {
        const simtradeModule = loadSimtrade();
        spyOn(tencentService, 'isHoliday').and.returnValue(Promise.resolve(true));

        const result = await simtradeModule.default.findYZM(new Date(2024, 0, 9, 8));

        expect(result).toEqual([]);
    });

    it('returns the expected boundary snapshot for exactly two consecutive rises.', async () => {
        const simtradeModule = loadSimtrade();
        const endDate = new Date(2024, 0, 9, 8);
        const candidate = makeDayRpt({
            code: 'sz000001',
            day: new Date(2024, 0, 8, 8),
            close: 13,
            avg: 13,
            vol: 100,
            rsi7: 62,
            rsi14: 61,
            ma: 12,
            bollDown: 10,
        });
        const history = [
            candidate,
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 5, 8), close: 12.6, avg: 12.6, vol: 90, rsi7: 61, rsi14: 60 }),
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 4, 8), close: 12.2, avg: 12.2, vol: 85, rsi7: 60, rsi14: 59 }),
            makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 3, 8), close: 12.1, avg: 12.1, vol: 80, rsi7: 60, rsi14: 58 }),
        ];
        spyOn(tencentService, 'isHoliday').and.callFake(async () => false);
        spyOn(dayrptService, 'getDayrptByReportDay').and.returnValue(Promise.resolve([candidate]));
        spyOn(dayrptService, 'getDayrptByReportDay2').and.returnValue(Promise.resolve(history));

        const result = await simtradeModule.default.findYZM(endDate);

        expect(result).toEqual([
            jasmine.objectContaining(makeExpectedResult({
                stockcode: 'sz000001',
                type: 'YZM',
                rsi7: 62,
                rsi14: 61,
                price: 13,
                ma: 12,
                bollDown: 10,
                eval: '2|双强|双6',
            })),
        ]);
    });
});

describe('simtrade-service findDoubleRise()', () => {
    it('returns the expected double-rise snapshot.', async () => {
        const simtradeModule = loadSimtrade();
        spyOn(dayrptService, 'getDayrptByReportDay').and.returnValues(
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 8, 8), close: 11, avg: 11, rsi7: 45, rsi14: 40 }),
            ]),
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 9, 8), close: 12, avg: 12, rsi7: 50, rsi14: 42, ma: 10.5, bollDown: 9.5 }),
            ]),
        );

        const result = await simtradeModule.default.findDoubleRise(new Date(2024, 0, 9, 8));

        expect(result).toEqual([
            jasmine.objectContaining(makeExpectedResult({
                stockcode: 'sz000001',
                type: '双升',
                rsi7: 50,
                rsi14: 42,
                price: 12,
                ma: 10.5,
                bollDown: 9.5,
            })),
        ]);
    });

    it('returns an empty array when RSI14 does not rise.', async () => {
        const simtradeModule = loadSimtrade();
        spyOn(dayrptService, 'getDayrptByReportDay').and.returnValues(
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 8, 8), close: 11, avg: 11, rsi7: 45, rsi14: 40 }),
            ]),
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 9, 8), close: 12, avg: 12, rsi7: 50, rsi14: 39, ma: 10.5, bollDown: 9.5 }),
            ]),
        );

        const result = await simtradeModule.default.findDoubleRise(new Date(2024, 0, 9, 8));

        expect(result).toEqual([]);
    });

    it('returns an empty array when the prior-day price is on the strict lower boundary.', async () => {
        const simtradeModule = loadSimtrade();
        spyOn(dayrptService, 'getDayrptByReportDay').and.returnValues(
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 8, 8), close: 10, avg: 10, rsi7: 45, rsi14: 40 }),
            ]),
            Promise.resolve([
                makeDayRpt({ code: 'sz000001', day: new Date(2024, 0, 9, 8), close: 12, avg: 12, rsi7: 50, rsi14: 42, ma: 10.5, bollDown: 9.5 }),
            ]),
        );

        const result = await simtradeModule.default.findDoubleRise(new Date(2024, 0, 9, 8));

        expect(result).toEqual([]);
    });
});

describe('analysis-service rsiCalc()', () => {
    it('returns 100/100 for a strictly rising 15-day fixture.', async () => {
        const dayrpts = Array.from({ length: 15 }, (_, index) => makeDayRpt({
            day: new Date(2024, 0, index + 1, 8),
            close: index + 1,
        }));

        const result = await analysisService.rsiCalc(dayrpts);

        expect(result.rsi7).toBe(100);
        expect(result.rsi14).toBe(100);
        expect(result.rsi7expect).toBe(16);
        expect(result.rsi14expect).toBe(16);
        expect(result.analysis).toBe('RSI(7) 极强，超买');
    });

    it('returns 0/0 for a strictly falling 15-day fixture.', async () => {
        const dayrpts = Array.from({ length: 15 }, (_, index) => makeDayRpt({
            day: new Date(2024, 0, index + 1, 8),
            close: 15 - index,
        }));

        const result = await analysisService.rsiCalc(dayrpts);

        expect(result.rsi7).toBe(0);
        expect(result.rsi14).toBe(0);
        expect(result.rsi7expect).toBe(0);
        expect(result.rsi14expect).toBe(0);
        expect(result.analysis).toBe('RSI(7) 极弱，超卖');
    });

    it('returns the 50/50 boundary snapshot for a balanced 15-day fixture.', async () => {
        const closes = [10, 11, 12, 13, 12, 11, 10, 10, 11, 12, 13, 12, 11, 10, 10];
        const dayrpts = closes.map((close, index) => makeDayRpt({
            day: new Date(2024, 0, index + 1, 8),
            close,
        }));

        const result = await analysisService.rsiCalc(dayrpts);

        expect(result.rsi7).toBe(50);
        expect(result.rsi14).toBe(50);
        expect(result.rsi7expect).toBe(11);
        expect(result.rsi14expect).toBe(11);
        expect(result.analysis).toBe('RSI(7) 强区');
    });

    it('returns the early-exit sentinel values for an empty array.', async () => {
        const result = await analysisService.rsiCalc([]);

        expect(result.rsi7).toBe(-1);
        expect(result.rsi14).toBe(-1);
        expect(result.analysis).toBe('');
    });
});
