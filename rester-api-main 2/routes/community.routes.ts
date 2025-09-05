import express from 'express';
import { createQuestion, getQuestionById, getQuestions } from '../controlers/question.controller';
import { createAnswer, getAnswers, likeAnswer } from '../controlers/answer.controller';

export const communityRouter = express.Router();

communityRouter.get('/get-questions', getQuestions);
communityRouter.post('/update-questions', createQuestion);
communityRouter.get('/get-question-id/:id', getQuestionById);

communityRouter.get('/questions/:id/answers', getAnswers);
communityRouter.post('/questions/:id/answers', createAnswer);
communityRouter.post('/answers/:id/like', likeAnswer);