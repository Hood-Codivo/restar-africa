import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { appealSuspension, deleteAppeal, getAllAppeals, getAppeal, updateAppealStatus } from '../controlers/apeal.suspension.controller';

const suspensionRouter = express.Router();

suspensionRouter.post(
    '/appeal-suspension', authenticate, appealSuspension
);

suspensionRouter.put(
    '/update-appeal-status/:appealId', authenticate, authorize("admin"), updateAppealStatus
);


suspensionRouter.get(
    '/appeal/:appealId', getAppeal
);

suspensionRouter.get(
    '/appeals', authenticate, getAllAppeals
);

suspensionRouter.delete(
    '/appeal/:appealId', authenticate, authorize("admin"), deleteAppeal
);

export default suspensionRouter;