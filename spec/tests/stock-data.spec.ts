import supertest from 'supertest';
import StatusCodes from 'http-status-codes';
import { SuperTest, Test, Response } from 'supertest';

import app from '@server';
import tencentstockService from '@services/tencentstock-service';
import dayrptService from '@services/dayrpt-service';
import stocknameService from '@services/stockname-service';

describe('stock-data-routes', () => {

    const stockPath = '/api/stock';
    const dayrptPath = '/api/dayrpt';
    const stocknamePath = '/api/stockname';
    const { OK } = StatusCodes;

    let agent: SuperTest<Test>;

    beforeAll(() => {
        agent = supertest.agent(app);
    });

    // ========== TencentStock Routes ==========

    describe('GET /api/stock/allbycodes/:stockcodes', () => {

        it('should return stock list for given codes', (done) => {
            const mockStocks = [
                { StockCode: 'sz000001', StockName: '平安银行', CurrentPrice: '15.50' },
                { StockCode: 'sh600519', StockName: '贵州茅台', CurrentPrice: '1800.00' },
            ];
            spyOn(tencentstockService, 'getstockList').and.returnValue(Promise.resolve(mockStocks as any));

            agent.get(`${stockPath}/allbycodes/sz000001,sh600519`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.stocks).toEqual(mockStocks);
                    expect(res.body.stocks.length).toBe(2);
                    done();
                });
        });
    });

    describe('GET /api/stock/bycode/:stockcode', () => {

        it('should return single stock details', (done) => {
            const mockStock = { StockCode: 'sz000001', StockName: '平安银行', CurrentPrice: '15.50', TradingVolume: '100000' };
            spyOn(tencentstockService, 'getone').and.returnValue(Promise.resolve(mockStock as any));

            agent.get(`${stockPath}/bycode/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.stock).toEqual(mockStock);
                    expect(res.body.stock.StockCode).toBe('sz000001');
                    done();
                });
        });
    });

    describe('GET /api/stock/getnotice/:stockcode', () => {

        it('should return notices for stock', (done) => {
            const mockNotices = [
                { title: '关于公司业绩预告', date: '2024-01-15' },
            ];
            spyOn(tencentstockService, 'getnotice').and.returnValue(Promise.resolve(mockNotices as any));

            agent.get(`${stockPath}/getnotice/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.noticelist).toEqual(mockNotices);
                    done();
                });
        });

        it('should return empty list when no notices', (done) => {
            spyOn(tencentstockService, 'getnotice').and.returnValue(Promise.resolve([] as any));

            agent.get(`${stockPath}/getnotice/sz999999`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.noticelist).toEqual([]);
                    done();
                });
        });
    });

    describe('GET /api/stock/supplydayrpt/:startday/:endday/:stockcode', () => {

        it('should return supplied day report data', (done) => {
            const mockDayrpts = [{ StockCode: 'sz000001', ReportDay: '2024-01-15' }];
            spyOn(tencentstockService, 'getdayrpt').and.returnValue(Promise.resolve(mockDayrpts as any));
            spyOn(dayrptService, 'addone').and.returnValue(Promise.resolve() as any)
            spyOn(dayrptService, 'persists').and.returnValue(Promise.resolve(false as any));

            agent.get(`${stockPath}/supplydayrpt/2024-01-01/2024-01-31/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    done();
                });
        });
    });

    // ========== DayReport Routes ==========

    describe('GET /api/dayrpt/allbyday/:reportday', () => {

        it('should return day reports for a specific day', (done) => {
            const mockDayrpts = [
                { StockCode: 'sz000001', ReportDay: new Date('2024-01-15') },
                { StockCode: 'sz000002', ReportDay: new Date('2024-01-15') },
            ];
            spyOn(dayrptService, 'getDayrptByReportDay').and.returnValue(Promise.resolve(mockDayrpts as any));

            agent.get(`${dayrptPath}/allbyday/2024-01-15`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.dayrpts).toBeDefined();
                    expect(res.body.dayrpts.length).toBe(2);
                    done();
                });
        });
    });

    describe('GET /api/dayrpt/allbycode/:stockcode', () => {

        it('should return day reports for a stock code', (done) => {
            const mockDayrpts = [
                { StockCode: 'sz000001', ReportDay: new Date('2024-01-14') },
                { StockCode: 'sz000001', ReportDay: new Date('2024-01-15') },
            ];
            spyOn(dayrptService, 'getDayrptByCode').and.returnValue(Promise.resolve(mockDayrpts as any));

            agent.get(`${dayrptPath}/allbycode/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.dayrpts.length).toBe(2);
                    done();
                });
        });
    });

    describe('GET /api/dayrpt/allbycondition/:startday/:endday/:stockcode', () => {

        it('should return day reports with stock name for condition query', (done) => {
            const mockDayrpts = [{ StockCode: 'sz000001', ReportDay: new Date('2024-01-15') }];
            const mockStockName = { StockCode: 'sz000001', StockName: '平安银行' };
            spyOn(dayrptService, 'getDayrptByCondition').and.returnValue(Promise.resolve(mockDayrpts as any));
            spyOn(stocknameService, 'getOne').and.returnValue(Promise.resolve(mockStockName as any));

            agent.get(`${dayrptPath}/allbycondition/2024-01-01/2024-01-31/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.dayrpts).toBeDefined();
                    expect(res.body.stockname).toBe('平安银行');
                    done();
                });
        });
    });

    // ========== StockName Routes ==========

    describe('GET /api/stockname/all', () => {

        it('should return all stock names', (done) => {
            const mockList = [
                { StockCode: 'sz000001', StockName: '平安银行' },
                { StockCode: 'sh600519', StockName: '贵州茅台' },
            ];
            spyOn(stocknameService, 'getAll').and.returnValue(Promise.resolve(mockList as any));

            agent.get(`${stocknamePath}/all`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.stocknamelist).toEqual(mockList);
                    expect(res.body.stocknamelist.length).toBe(2);
                    done();
                });
        });
    });

    describe('GET /api/stockname/getone/:stockcode', () => {

        it('should return a single stock name', (done) => {
            const mockName = { StockCode: 'sz000001', StockName: '平安银行' };
            spyOn(stocknameService, 'getOne').and.returnValue(Promise.resolve(mockName as any));

            agent.get(`${stocknamePath}/getone/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.stockname).toEqual(mockName);
                    done();
                });
        });

        it('should handle non-existent stock code', (done) => {
            spyOn(stocknameService, 'getOne').and.returnValue(Promise.resolve(null as any));

            agent.get(`${stocknamePath}/getone/zz999999`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.stockname).toBeNull();
                    done();
                });
        });
    });
});
