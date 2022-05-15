import { Router } from 'express';
import { adminMw } from './middleware';
import authRouter from './auth-router';
import userRouter from './user-router';
import mylistRouter from './mylist-router';
import observerRouter from './observer-router';
import dayrptRouter from './dayrpt-router';
import sinastockRouter from './sinastock-router';
import daylogRouter from './daylog-router';


// Init
const apiRouter = Router();

// Add api routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/observers', observerRouter);
apiRouter.use('/mylist', mylistRouter);
apiRouter.use('/dayrpt', dayrptRouter);
apiRouter.use('/stock', sinastockRouter);
apiRouter.use('/daylog', daylogRouter);

// Export default
export default apiRouter;
