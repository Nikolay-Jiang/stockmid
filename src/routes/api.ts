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
import ntfyRouter from './ntfy-router';
import { adminMw } from './middleware';


// Init
const apiRouter = Router();

// Add api routes
apiRouter.use('/auth', authRouter);//用户认证
apiRouter.use('/users', userRouter);//用户管理
apiRouter.use('/observers', observerRouter);//观察列表
apiRouter.use('/mylist', mylistRouter);//我的列表
apiRouter.use('/dayrpt', dayrptRouter);//日报
apiRouter.use('/stock', tencentstockRouter);
apiRouter.use('/daylog', daylogRouter);
apiRouter.use('/stockname', stocknameRouter);//股票名称
apiRouter.use('/analysis', analysisRouter);//分析
apiRouter.use('/sim', simRouter);//模拟
apiRouter.use('/predict', preRouter);//预测
apiRouter.use('/ai', deepseek);//AI
apiRouter.use('/ntfy', ntfyRouter);//ntfy.sh

// Export default
export default apiRouter;
