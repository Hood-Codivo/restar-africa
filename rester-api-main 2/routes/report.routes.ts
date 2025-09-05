


import express from 'express';
import { createReport, deleteReport, getReports } from '../controlers/report.controller';


const reportRouter = express.Router();

reportRouter.post('/report-listing', createReport);
reportRouter.get('/get-reports', getReports);
reportRouter.delete('/delete-reports/:id', deleteReport);

export default reportRouter;
