 import express from 'express'
import { authenticate } from '../middleware/auth';
import { createPolicy, deletePolicy, editPolicy, getPrivacyPolicies } from '../controlers/policy.controller';
import { createTermPolicy, deleteTermPolicy, editTermPolicy, getTermPolicies } from '../controlers/terms.controller';
 
 export const policyRouter = express.Router();

policyRouter.get('/policies', getPrivacyPolicies)
policyRouter.post('/create-policies', authenticate, createPolicy);
policyRouter.put('/edit-policy/:id', authenticate, editPolicy)
policyRouter.delete('/delete-policy/:id', authenticate, deletePolicy)
policyRouter.get('/term-policies', getTermPolicies)
policyRouter.post('/term-create-policies', authenticate, createTermPolicy);
policyRouter.put('/term-edit-policy/:id', authenticate, editTermPolicy)
policyRouter.delete('/term-delete-policy/:id', authenticate, deleteTermPolicy)

