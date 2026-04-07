import supertest from 'supertest';
import StatusCodes from 'http-status-codes';
import { SuperTest, Test, Response } from 'supertest';

import app from '@server';
import predictService from '@services/predict-service';

type TReqBody = string | object | undefined;

describe('predict-routes', () => {

    const predictPath = '/api/predict';
    const { OK, INTERNAL_SERVER_ERROR } = StatusCodes;

    let agent: SuperTest<Test>;

    beforeAll(() => {
        agent = supertest.agent(app);
    });

    describe('GET /getallbyday/:startday/:endday', () => {

        it('should return predicts for valid date range', (done) => {
            const mockPredicts = [
                { PredictKey: 'k1', StockCode: 'sz000001', Type: 'YZM' },
                { PredictKey: 'k2', StockCode: 'sz000002', Type: 'W' },
            ];
            spyOn(predictService, 'getPredictByPredictTime').and.returnValue(Promise.resolve(mockPredicts as any));

            agent.get(`${predictPath}/getallbyday/2024-01-01/2024-01-31`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.predicts).toEqual(mockPredicts);
                    done();
                });
        });

        it('should return 500 when service throws', (done) => {
            spyOn(predictService, 'getPredictByPredictTime').and.throwError('DB error');

            agent.get(`${predictPath}/getallbyday/2024-01-01/2024-01-31`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(INTERNAL_SERVER_ERROR);
                    expect(res.body.error).toBeDefined();
                    done();
                });
        });
    });

    describe('GET /getbycode/:startday/:endday/:stockcode', () => {

        it('should return predicts for a specific stock code', (done) => {
            const mockPredicts = [
                { PredictKey: 'k3', StockCode: 'sz000001', Type: 'YZM' },
            ];
            spyOn(predictService, 'getPredictByCode').and.returnValue(Promise.resolve(mockPredicts as any));

            agent.get(`${predictPath}/getbycode/2024-01-01/2024-01-31/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.predicts).toEqual(mockPredicts);
                    done();
                });
        });
    });

    describe('GET /getbycode2/:startday/:stockcode', () => {

        it('should return predicts by code with computed date range', (done) => {
            const mockPredicts = [
                { PredictKey: 'k4', StockCode: 'sz000001', Type: 'W' },
            ];
            spyOn(predictService, 'getPredictByCode').and.returnValue(Promise.resolve(mockPredicts as any));

            agent.get(`${predictPath}/getbycode2/2024-01-15/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.predicts).toEqual(mockPredicts);
                    done();
                });
        });
    });

    describe('GET /getbyday/:startday/:evalnumber', () => {

        it('should return predicts with stats for a day', (done) => {
            const mockPredicts = [
                { PredictKey: 'k5', StockCode: 'sz000003', Type: 'YZM' },
            ];
            spyOn(predictService, 'getPredictByDay').and.returnValue(Promise.resolve(mockPredicts as any));

            agent.get(`${predictPath}/getbyday/2024-01-15/0.5`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.predicts).toEqual(mockPredicts);
                    expect(res.body.statsGood).toBeDefined();
                    done();
                });
        });
    });

    describe('GET /getbyday2/:startday/:evalnumber/:type', () => {

        it('should return filtered predicts by type YZM', (done) => {
            const mockPredicts = [
                { PredictKey: 'k6', StockCode: 'sz000001', Type: 'YZM' },
                { PredictKey: 'k7', StockCode: 'sz000002', Type: 'W' },
            ];
            spyOn(predictService, 'getPredictByDay').and.returnValue(Promise.resolve(mockPredicts as any));

            agent.get(`${predictPath}/getbyday2/2024-01-15/0.5/YZM`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    // Should only return YZM type
                    expect(res.body.predicts.length).toBe(1);
                    expect(res.body.predicts[0].Type).toBe('YZM');
                    done();
                });
        });

        it('should apply sim1 filter for YZM-SIM1 type', (done) => {
            const mockPredicts = [
                { PredictKey: 'k8', StockCode: 'sz000001', Type: 'YZM' },
                { PredictKey: 'k9', StockCode: 'sz000002', Type: 'YZM' },
            ];
            spyOn(predictService, 'getPredictByDay').and.returnValue(Promise.resolve(mockPredicts as any));
            spyOn(predictService, 'sim1').and.returnValue('sz000001');

            agent.get(`${predictPath}/getbyday2/2024-01-15/0.5/YZM-SIM1`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.predicts.length).toBe(1);
                    expect(res.body.predicts[0].StockCode).toBe('sz000001');
                    done();
                });
        });

        it('should return empty when sim1 returns empty string', (done) => {
            const mockPredicts = [
                { PredictKey: 'k10', StockCode: 'sz000001', Type: 'YZM' },
            ];
            spyOn(predictService, 'getPredictByDay').and.returnValue(Promise.resolve(mockPredicts as any));
            spyOn(predictService, 'sim1').and.returnValue('');

            agent.get(`${predictPath}/getbyday2/2024-01-15/0.5/YZM-SIM1`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    // Empty string means no sim1 matches
                    expect(res.body).toBe('');
                    done();
                });
        });
    });

    describe('GET /backtest/:startday/:evalnumber', () => {

        it('should return backtest results with W and YZM text', (done) => {
            // Need to add dayrptService import and mock
            const dayrptService = require('@services/dayrpt-service').default;
            const mockDayrpt = { TodayClosePrice: 4000, TodayOpenPrice: 3980 };
            spyOn(dayrptService, 'getone').and.returnValue(Promise.resolve(mockDayrpt as any));

            const mockPredicts = [
                { StockCode: 'sz000001', Type: 'YZM', isGood: true, MaxDayDiff: 3, evalprice: 0.5 },
                { StockCode: 'sz000002', Type: 'W', isGood: false, MaxDayDiff: 0, evalprice: 0 },
            ];
            spyOn(predictService, 'getPredictByDay').and.returnValue(Promise.resolve(mockPredicts as any));
            spyOn(predictService, 'sim1').and.returnValue('sz000001');

            agent.get(`${predictPath}/backtest/2024-01-15/0.5`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body.WText).toBeDefined();
                    expect(res.body.YZMText).toBeDefined();
                    done();
                });
        });
    });
});
