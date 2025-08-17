import { Router } from 'express';
import authRouter from './auth-router';
import userRouter from './user-router';
import mylistRouter from './mylist-router';
import observerRouter from './observer-router';
import dayrptRouter from './dayrpt-router';
import tencentstockRouter from './tencentstock-router';
import daylogRouter from './daylog-router';
import stocknameRouter from './stockname-router';
import analysisRouter from './analysis-router';
import simRouter from './simtrade-router';
import preRouter from './predict-router';
import deepseek from './deepseek-router';
import { adminMw } from './middleware';


// Init
const apiRouter = Router();

// Add api routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/observers', observerRouter);
apiRouter.use('/mylist', mylistRouter);
apiRouter.use('/dayrpt', dayrptRouter);
apiRouter.use('/stock', tencentstockRouter);
apiRouter.use('/daylog', daylogRouter);
apiRouter.use('/stockname', stocknameRouter);
apiRouter.use('/analysis', analysisRouter);
apiRouter.use('/sim', simRouter);
apiRouter.use('/predict', preRouter);
apiRouter.use('/ai', deepseek);

// Export default
export default apiRouter;
