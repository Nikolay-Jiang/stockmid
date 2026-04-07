import supertest from 'supertest';
import StatusCodes from 'http-status-codes';
import { SuperTest, Test, Response } from 'supertest';

import app from '@server';
import simService from '@services/simtrade';

type TReqBody = string | object | undefined;

describe('simtrade-routes', () => {

    const simPath = '/api/sim';
    const { OK } = StatusCodes;

    let agent: SuperTest<Test>;

    beforeAll(() => {
        agent = supertest.agent(app);
    });

    // ========== Scan Routes ==========

    describe('GET /findw/:endday', () => {

        it('should return results when W patterns found', (done) => {
            const mockResult = [{ stockcode: 'sz000001', eval: 'test', price: 15 }];
            spyOn(simService, 'evaluateFindW').and.returnValue(Promise.resolve(mockResult as any));

            agent.get(`${simPath}/findw/2024-01-15`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body).toEqual(mockResult);
                    done();
                });
        });

        it('should return "not find" text when no patterns found', (done) => {
            spyOn(simService, 'evaluateFindW').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/findw/2024-01-15`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    describe('GET /findwon/', () => {

        it('should return results when W online patterns found', (done) => {
            const mockResult = [{ stockcode: 'sz000002', eval: 'W found' }];
            spyOn(simService, 'findAndSaveWOnline').and.returnValue(Promise.resolve(mockResult as any));

            agent.get(`${simPath}/findwon/`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body).toEqual(mockResult);
                    done();
                });
        });

        it('should return "not find" when no online W patterns', (done) => {
            spyOn(simService, 'findAndSaveWOnline').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/findwon/`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    describe('GET /findyzm/:endday', () => {

        it('should return YZM results when patterns found', (done) => {
            const mockResult = [{ stockcode: 'sz000003', eval: '3|量价齐升' }];
            spyOn(simService, 'evaluateFindYZM').and.returnValue(Promise.resolve(mockResult as any));

            agent.get(`${simPath}/findyzm/2024-02-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body).toEqual(mockResult);
                    done();
                });
        });

        it('should return "not find" when no YZM patterns', (done) => {
            spyOn(simService, 'evaluateFindYZM').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/findyzm/2024-02-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    describe('GET /findyzmon/', () => {

        it('should return "accomplish" when YZM online succeeds', (done) => {
            spyOn(simService, 'findAndSaveYZMOnline').and.returnValue(Promise.resolve([{ stockcode: 'test' }] as any));

            agent.get(`${simPath}/findyzmon/`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('accomplish');
                    done();
                });
        });

        it('should return "not find" when no online YZM patterns', (done) => {
            spyOn(simService, 'findAndSaveYZMOnline').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/findyzmon/`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    describe('GET /findyzmonbyday/:endday', () => {

        it('should return "accomplish" when YZM by day succeeds', (done) => {
            spyOn(simService, 'findAndSaveYZMByDay').and.returnValue(Promise.resolve([{ stockcode: 'test' }] as any));

            agent.get(`${simPath}/findyzmonbyday/2024-03-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('accomplish');
                    done();
                });
        });

        it('should return "not find" when no patterns for day', (done) => {
            spyOn(simService, 'findAndSaveYZMByDay').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/findyzmonbyday/2024-03-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    // ========== Simulation Routes ==========

    describe('GET /simfrompredict/:startday', () => {

        it('should return "page end!" when simulation has results', (done) => {
            spyOn(simService, 'simulateFromPredictions').and.returnValue(Promise.resolve({ total: 5, results: [] } as any));

            agent.get(`${simPath}/simfrompredict/2024-01-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('page end!');
                    done();
                });
        });

        it('should return "not find" when simulation has zero results', (done) => {
            spyOn(simService, 'simulateFromPredictions').and.returnValue(Promise.resolve({ total: 0, results: [] } as any));

            agent.get(`${simPath}/simfrompredict/2024-01-01`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.text).toContain('not find');
                    done();
                });
        });
    });

    describe('GET /statistics/:startday/:endday/:stockcode', () => {

        it('should return JSON statistics result', (done) => {
            const mockResult = { stockcode: 'sz000001', profit: 1500, trades: 10 };
            spyOn(simService, 'runStatistics').and.returnValue(Promise.resolve(mockResult as any));

            agent.get(`${simPath}/statistics/2024-01-01/2024-06-01/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    expect(res.body).toEqual(mockResult);
                    done();
                });
        });

        it('should return empty when statistics returns null', (done) => {
            spyOn(simService, 'runStatistics').and.returnValue(Promise.resolve(null as any));

            agent.get(`${simPath}/statistics/2024-01-01/2024-06-01/sz000001`)
                .end((err: Error, res: Response) => {
                    expect(res.status).toBe(OK);
                    done();
                });
        });
    });
});
