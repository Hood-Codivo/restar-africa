import { authenticate } from '../middleware/auth';
import express from 'express'
import { getActiveListings, getActiveUsers, getBookingOverview, getBookingsCount, getRecentBookings, getTotalRevenue, getUserManagement } from '../controlers/dashboard.controller';

export const dashboardRouter = express.Router();

dashboardRouter.get("/admin-total-revenue",  authenticate, getTotalRevenue)

dashboardRouter.get("/admin-revenue-count",  authenticate, getBookingsCount)

dashboardRouter.get("/admin-active-users",  authenticate, getActiveUsers)

dashboardRouter.get('/admin-active-listings', authenticate, getActiveListings)

dashboardRouter.get('/admin-get-booking-overview', authenticate, getBookingOverview)

dashboardRouter.get('/admin-recent-booking', authenticate, getRecentBookings)


// admin-user-management
dashboardRouter.get('/admin-user-management', authenticate, getUserManagement)