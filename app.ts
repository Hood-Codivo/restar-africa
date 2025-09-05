require('dotenv').config();
import express, { Request, Response } from "express";
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from "cookie-parser"; 
import userRouter from "./routes/user.routes";
import { ErrorMiddleware } from "./middleware/error";
import { listingRouter } from "./routes/listing.routes";
import { bookingRouter } from "./routes/booking.routes";
import { notificationRouter } from "./routes/notification.routes";
import { blogRouter } from "./routes/blog.routes";
import { locationRouter } from "./routes/location.countires.routes";
import { paymentRouter } from "./routes/payment.routes";
import faqRouter from "./routes/faq.routes";
import solRouter from "./routes/solutions.routes";
import { policyRouter } from "./routes/privacypolicy.routes";
import careerRouter from "./routes/career.routes";
import { newsletterRouter } from "./routes/newsletter.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import favouriteRouter from "./routes/favourite.routes";
import suspensionRouter from "./routes/suspension.apeal.routes";
import reportRouter from "./routes/report.routes";
import { communityRouter } from "./routes/community.routes";
import emailRouter from "./routes/email.user.routes";
import { allListingsRouter } from "./routes/get.listings.routes";
import { countryRouter } from "./routes/country.routes";

import earningRouter from "./routes/earning.routes";
import bankRouter from "./routes/bank.routes";

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", // <--- Add your actual frontend origin here
    "https://rester.africa",
    "https://www.your-production-domain.com",
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200, // Changed to 200
  preflightContinue: false,
  maxAge: 86400, // Add max-age for preflight caching
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Create Socket.IO server with enhanced CORS
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000
});


// Apply all routes
app.use("/api/v1", 
  userRouter, 
  listingRouter,
  bookingRouter,  
  notificationRouter,
  blogRouter,
  locationRouter,
  paymentRouter,
  faqRouter,
  solRouter,
  policyRouter,
  careerRouter,
  newsletterRouter,
  dashboardRouter,
  favouriteRouter,
  suspensionRouter,
  listingRouter,
  reportRouter,
  communityRouter, 
  emailRouter,
  allListingsRouter,
  countryRouter,
  earningRouter,
  bankRouter,
);


// testing api
app.get("/rester-testing", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is working",
    version: "1.0.0"
  });
});

// unknown routes 
app.all("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found!`,
    path: req.path,
    method: req.method
  });
});

// Cleanup old messages every day
setInterval(async () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    // console.log(`Cleaned up ${result.deletedCount} old messages`);
  } catch (error) {
    console.error('Error cleaning up old messages:', error);
  }
}, 24 * 60 * 60 * 1000);

// Error handler middleware
app.use(ErrorMiddleware);

export { app, server, io };