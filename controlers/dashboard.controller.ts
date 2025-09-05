import { Request, Response } from 'express';
import Booking from '../models/book.model';
import userModel from '../models/user_model';
import listingModel from '../models/listing.model';

// Total Revenue API
export const getTotalRevenue = async (req: Request, res: Response) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const result = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: 'completed',
                    createdAt: { $gte: new Date(currentYear, currentMonth, 1) }
                }
            },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

        // Fetch last month's revenue
        const lastMonthResult = await Booking.aggregate([
            {
                $match: {
                    paymentStatus: 'completed',
                    createdAt: {
                        $gte: new Date(currentYear, currentMonth - 1, 1),
                        $lt: new Date(currentYear, currentMonth, 1)
                    }
                }
            },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
        ]);

        const lastMonthRevenue = lastMonthResult.length > 0 ? lastMonthResult[0].totalRevenue : 0;
        const percentageChange = lastMonthRevenue !== 0
            ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 100;

        res.json({ totalRevenue, percentageChange });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching total revenue', error });
    }
};

// Bookings API
export const getBookingsCount = async (req: Request, res: Response) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const totalBookings = await Booking.countDocuments({
            bookingStatus: 'completed',
            createdAt: { $gte: new Date(currentYear, currentMonth, 1) }
        });

        // Fetch last month's completed bookings count
        const lastMonthBookings = await Booking.countDocuments({
            bookingStatus: 'completed',
            createdAt: {
                $gte: new Date(currentYear, currentMonth - 1, 1),
                $lt: new Date(currentYear, currentMonth, 1)
            }
        });

        const percentageChange = lastMonthBookings !== 0
            ? ((totalBookings - lastMonthBookings) / lastMonthBookings) * 100
            : 100;

        res.json({ totalBookings, lastMonthBookings, percentageChange });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings count', error });
    }
};

// Active Users API
export const getActiveUsers = async (req: Request, res: Response) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const activeUsers = await userModel.countDocuments({
            isVerified: true,
            createdAt: { $lte: currentDate }
        });

        // Fetch last month's active users count
        const lastMonthActiveUsers = await userModel.countDocuments({
            isVerified: true,
            createdAt: { $lt: new Date(currentYear, currentMonth, 1) }
        });

        const percentageChange = lastMonthActiveUsers !== 0
            ? ((activeUsers - lastMonthActiveUsers) / lastMonthActiveUsers) * 100
            : 100;

        res.json({ activeUsers, percentageChange });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching active users', error });
    }
};

export const getActiveListings = async (req: Request, res: Response) => {
    try {
        const currentDate = new Date();
        const oneHourAgo = new Date(currentDate.getTime() - 60 * 60 * 1000);

        // Get total listings count (both approved and not approved)
        const totalListings = await listingModel.countDocuments({ isAprove: true }); //when the listing is approve bu the admin

        // Get total active (approved) listings
        const totalActiveListings = await listingModel.countDocuments({ isAprove: true });

        // Get active listings count from one hour ago
        const lastHourActiveListings = await listingModel.countDocuments({
            isAprove: true,
            updatedAt: { $lte: oneHourAgo }
        });

        const change = totalActiveListings - lastHourActiveListings;

        res.json({
            totalListings,
            totalActiveListings,
            change
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching active listings', error });
    }
};



// Booking Overview API
export const getBookingOverview = async (req: Request, res: Response) => {
    try {
        const currentYear = new Date().getFullYear();
        const bookingOverview = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(currentYear, 0, 1), $lt: new Date(currentYear + 1, 0, 1) }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    bookings: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: '$_id',
                    bookings: 1
                }
            },
            { $sort: { month: 1 } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedOverview = monthNames.map((name, index) => {
            const monthData = bookingOverview.find(item => item.month === index + 1);
            return { name, bookings: monthData ? monthData.bookings : 0 };
        });

        res.json(formattedOverview);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching booking overview', error });
    }
};

// Recent Bookings API
export const getRecentBookings = async (req: Request, res: Response) => {
    try {
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name')
            .populate('property', 'name')
            .select('user property totalAmount createdAt');

        const formattedBookings = recentBookings.map(booking => ({
            id: booking._id,
            user: booking.userName,
            property: booking.propertyName,
            date: booking.createdAt.toISOString().split('T')[0],
            amount: booking.totalAmount
        }));

        res.json(formattedBookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent bookings', error });
    }
};

// User Management API
export const getUserManagement = async (req: Request, res: Response) => {
    try {
        const { role, search, page = 1, limit = 10 } = req.query;
        const query: any = {};

        if (role && role !== 'all') {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const totalUsers = await userModel.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / Number(limit));

        const users = await userModel.find(query)
            .select('name email role')
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json({
            users,
            currentPage: Number(page),
            totalPages,
            totalUsers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user management data', error });
    }
};