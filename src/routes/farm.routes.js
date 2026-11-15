import { Router } from 'express';
import { getAllFarms, getFarmById, logFieldObservation } from '../controllers/farm.controller.js';

const router = Router();

router.get('/', getAllFarms);
router.get('/:farmId', getFarmById);
router.post('/:farmId/observations', logFieldObservation);

export default router;
