import express from 'express';
import { authenticate } from '../middleware/auth'; // Assuming you have an authentication middleware
import { addBankAccount, getBankAccounts, removeBankAccount, updateBankAccount } from '../controlers/bank.controller';

const bankRouter = express.Router();

// Route to get all bank accounts for the authenticated user
bankRouter.get('/banks', authenticate, getBankAccounts);

// Route to add a new bank account
bankRouter.post('/banks', authenticate, addBankAccount);

// Route to update a specific bank account by its ID
bankRouter.put('/banks/:bankId', authenticate, updateBankAccount);

// Route to remove a specific bank account by its ID
bankRouter.delete('/banks/:bankId', authenticate, removeBankAccount);

export default bankRouter;