import { Router } from 'express';
import scanRoutes from './scan-routes';
import simRoutes from './sim-routes';

const router = Router();

router.use('/', scanRoutes);
router.use('/', simRoutes);

export default router;
