import supertest from 'supertest';
import StatusCodes from 'http-status-codes';
import { SuperTest, Test, Response } from 'supertest';

import app from '@server';
import observerService from '@services/observer-service';
import tencentstockService from '@services/tencentstock-service';
import dayrptService from '@services/dayrpt-service';
import analService from '@services/analysis-service';
import qwenService from '@services/qwen-service';
import ntfyService from '@services/ntfy-service';
import daylogService from '@services/daylog-service';
import loginAgent from '../support/login-agent';
import * as middleware from '@routes/middleware';

describe('misc-modules', () => {

    const { OK, BAD_REQUEST, CREATED } = StatusCodes;

    let agent: SuperTest<Test>;
    let jwtToken: string;

    beforeAll((done) => {
        agent = supertest.agent(app);
        loginAgent.login(agent, (token: string) => {
            jwtToken = token;
            done();
        });
    });

    // ========== Observer Routes (JWT header auth) ==========

    describe('observer-routes (/api/observers)', () => {

        const observerPath = '/api/observers';

        describe('GET /all/', () => {

            it('should return observers for authenticated user', (done) => {
                const mockObservers = [
                    { StockCode: 'sz000001', UserID: 'user1' },
                    { StockCode: 'sh600519', UserID: 'user1' },
                ];
                spyOn(observerService, 'getAll').and.returnValue(Promise.resolve(mockObservers as any));

                agent.get(`${observerPath}/all/`)
                    .set('Authorization', jwtToken)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.observers).toEqual(mockObservers);
                        done();
                    });
            });

            it('should throw when no authorization header', (done) => {
                agent.get(`${observerPath}/all/`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(BAD_REQUEST);
                        done();
                    });
            });
        });

        describe('POST /add/', () => {

            it('should add observer for authenticated user', (done) => {
                spyOn(observerService, 'addOne').and.returnValue(Promise.resolve());

                agent.post(`${observerPath}/add/`)
                    .set('Authorization', jwtToken)
                    .send({ observer: { StockCode: 'sz000001' } })
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(CREATED);
                        done();
                    });
            });

            it('should throw when no observer in body', (done) => {
                agent.post(`${observerPath}/add/`)
                    .set('Authorization', jwtToken)
                    .send({})
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(BAD_REQUEST);
                        done();
                    });
            });
        });

        describe('DELETE /delete/:stockcode/', () => {

            it('should delete observer for authenticated user', (done) => {
                spyOn(observerService, 'delete').and.returnValue(Promise.resolve());

                agent.delete(`${observerPath}/delete/sz000001/`)
                    .set('Authorization', jwtToken)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        done();
                    });
            });
        });
    });

    // ========== MyList Routes (cookie auth — spy on GetUserID) ==========

    describe('mylist-routes (/api/mylist)', () => {

        const mylistPath = '/api/mylist';

        describe('GET /all', () => {

            it('should return mylist data when GetUserID succeeds', (done) => {
                // Spy on GetUserID to bypass cookie auth
                spyOn(middleware, 'GetUserID').and.returnValue(Promise.resolve('testuser1' as any));

                const mockObservers = [{ StockCode: 'sz000001', UserID: 'testuser1' }];
                const mockStocks = [{ StockCode: 'sz000001', CurrentPrice: '15.50' }];
                const mockDayrpts = [{ StockCode: 'sz000001', ReportDay: new Date() }];

                spyOn(observerService, 'getAll').and.returnValue(Promise.resolve(mockObservers as any));
                spyOn(tencentstockService, 'getstockList').and.returnValue(Promise.resolve(mockStocks as any));
                spyOn(dayrptService, 'getDayrptByCondition').and.returnValue(Promise.resolve(mockDayrpts as any));

                agent.get(`${mylistPath}/all`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.observers).toBeDefined();
                        expect(res.body.stocklist).toBeDefined();
                        expect(res.body.dayrptlist).toBeDefined();
                        done();
                    });
            });
        });
    });

    // ========== Analysis Routes ==========

    describe('analysis-routes (/api/analysis)', () => {

        const analysisPath = '/api/analysis';

        describe('GET /allbycondition/:startday/:endday/:stockcode', () => {

            it('should return analysis text and rate data', (done) => {
                const mockDayrpts = [
                    { StockCode: 'sz000001', ReportDay: new Date('2024-01-10'), TodayClosePrice: 15 },
                    { StockCode: 'sz000001', ReportDay: new Date('2024-01-11'), TodayClosePrice: 16 },
                ];
                const mockStock = { StockCode: 'sz000001', TradingVolume: '0' };
                const mockBoll = { up: 18, mid: 15, down: 12 };
                const mockRsi = { rsi7: 55, rsi14: 50 };
                const mockRateData = [{ rateprice: 1.5 }];

                spyOn(dayrptService, 'getDayrptByCondition').and.returnValue(Promise.resolve(mockDayrpts as any));
                spyOn(tencentstockService, 'getone').and.returnValue(Promise.resolve(mockStock as any));
                spyOn(analService, 'bollCalc').and.returnValue(Promise.resolve(mockBoll as any));
                spyOn(analService, 'rsiCalc').and.returnValue(Promise.resolve(mockRsi as any));
                spyOn(analService, 'GetRateData').and.returnValue(Promise.resolve(mockRateData as any));
                spyOn(analService, 'getAnalyTxt').and.returnValue('Analysis text result');

                agent.get(`${analysisPath}/allbycondition/2024-01-01/2024-01-31/sz000001`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.txtresult).toBeDefined();
                        expect(res.body.rateanalysisdata).toBeDefined();
                        done();
                    });
            });

            it('should return empty when no day reports exist', (done) => {
                spyOn(dayrptService, 'getDayrptByCondition').and.returnValue(Promise.resolve([] as any));

                agent.get(`${analysisPath}/allbycondition/2024-01-01/2024-01-31/sz999999`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        done();
                    });
            });
        });

        describe('GET /bestrate/:stockcode/:daycount', () => {

            it('should return best rate analysis', (done) => {
                const mockDayrpts = [{ StockCode: 'sz000001', ReportDay: new Date() }];
                const mockRateData = [{ rateprice: 0.8 }, { rateprice: 1.2 }];

                spyOn(dayrptService, 'getDayrptByCondition').and.returnValue(Promise.resolve(mockDayrpts as any));
                spyOn(analService, 'GetRateData').and.returnValue(Promise.resolve(mockRateData as any));

                agent.get(`${analysisPath}/bestrate/sz000001/30`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.bestrate).toBe(1.2);
                        expect(res.body.rateanalysisdata).toBeDefined();
                        done();
                    });
            });
        });
    });

    // ========== AI/Qwen Routes ==========

    describe('ai-routes (/api/ai)', () => {

        const aiPath = '/api/ai';

        describe('GET /callds/:stockcode', () => {

            it('should return AI analysis content', (done) => {
                const mockContent = '根据基本面分析，该股票估值合理...';
                spyOn(qwenService, 'getds').and.returnValue(Promise.resolve(mockContent as any));

                agent.get(`${aiPath}/callds/sz000001`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.dscontent).toBe(mockContent);
                        done();
                    });
            });
        });
    });

    // ========== Ntfy Routes ==========

    describe('ntfy-routes (/api/ntfy)', () => {

        const ntfyPath = '/api/ntfy';

        describe('GET /sendnotice/:postmessage', () => {

            it('should send notification successfully', (done) => {
                spyOn(ntfyService, 'sendPostRequest').and.returnValue(Promise.resolve());

                agent.get(`${ntfyPath}/sendnotice/test-notification-message`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(ntfyService.sendPostRequest).toHaveBeenCalledWith('test-notification-message');
                        done();
                    });
            });
        });
    });

    // ========== DayLog Routes ==========

    describe('daylog-routes (/api/daylog)', () => {

        const daylogPath = '/api/daylog';

        describe('GET /allbycondition/:startday/:endday/:stockcode', () => {

            it('should return day logs for date range and stock', (done) => {
                const mockLogs = [
                    { StockCode: 'sz000001', SearchTime: new Date('2024-01-15T10:30:00') },
                    { StockCode: 'sz000001', SearchTime: new Date('2024-01-15T14:00:00') },
                ];
                spyOn(daylogService, 'getDaylogByCondition').and.returnValue(Promise.resolve(mockLogs as any));

                agent.get(`${daylogPath}/allbycondition/2024-01-15/2024-01-15/sz000001`)
                    .end((err: Error, res: Response) => {
                        expect(res.status).toBe(OK);
                        expect(res.body.daylogs).toBeDefined();
                        expect(res.body.daylogs.length).toBe(2);
                        done();
                    });
            });
        });
    });
});
