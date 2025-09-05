import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
    cancelBooking, confirmBooking, createBooking,
    createOfflineBooking,
    deleteBooking, downloadReportHost, getAllBooking, getBookingById, getBookingStatusStats,
    getCustomerReportStats,
    getHostBookingStatusStats, 
    getHostRevenueStats,
    getMyBookingById, getMyHostBookingById, getRevenueAnalysis,
    getRevenueStats, hostBookingSources, hostDashboardSummary, hostMonthlyStats, hostPropertyPerformance, updateBooking,
} from '../controlers/booking.controller';


export const bookingRouter = express.Router();

bookingRouter.post('/creating-booking', createBooking, authenticate);
bookingRouter.post('/create-offline-booking', createOfflineBooking)



bookingRouter.put('/update-booking/:bookingId', authenticate, updateBooking)






bookingRouter.get('/get-booking-revenue', getRevenueAnalysis);
bookingRouter.get('/get-all-bookings', authenticate, authorize('admin'), getAllBooking);
bookingRouter.delete('/booking/delete/:id', authenticate, deleteBooking)





// admin financials 

bookingRouter.get('/booking-stats-failed', authenticate, getBookingStatusStats)
bookingRouter.get('/revenue-stats', authenticate, getRevenueStats) 
bookingRouter.get('/customer-care-revenue-stats', authenticate, getCustomerReportStats)
// host financails 
bookingRouter.get('/revenue-stats-host/:hostId', getHostRevenueStats);
bookingRouter.get('/booking-status-stats-host/:hostId', getHostBookingStatusStats);

bookingRouter.get('/booking-by-id/:id', authenticate, getBookingById)

// not working
bookingRouter.post('/booking/:bookingId/cancel', authenticate, cancelBooking)
bookingRouter.post('/booking/:bookingId/confirm', authenticate, confirmBooking)

bookingRouter.get('/get-my-bookingById/:userId', authenticate, getMyBookingById)
bookingRouter.get('/booking-host-stats/:hostId', authenticate, getMyHostBookingById)


// dashbaord routers for the host

bookingRouter.get('/dashboard-summary', authenticate, hostDashboardSummary)
bookingRouter.get('/host-monthly-stats', authenticate, hostMonthlyStats)
bookingRouter.get('/host-property-performance-stats', authenticate, hostPropertyPerformance)
bookingRouter.get('/booking-sources', authenticate, hostBookingSources)






bookingRouter.get('/download-reportx', downloadReportHost, authenticate)