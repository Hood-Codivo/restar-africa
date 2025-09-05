import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPaymentApi, makePaymentApi } from '../controlers/payment.controller';


export const paymentRouter = express.Router();

paymentRouter.post('/make-payment', makePaymentApi, authenticate, authorize('guest'));
paymentRouter.get('/payment/verify/:transaction_id', getPaymentApi);
