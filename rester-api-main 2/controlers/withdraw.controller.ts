import { Request, Response } from 'express';
import userModel from '../models/user_model';
import withdrawRequestModels from '../models/withdraw.request.models';
import Notification from '../models/notificationModel';
import { createObjectCsvStringifier } from 'csv-writer';


export const createWithdrawRequest = async (req: Request, res: Response) => {
    try {
        const { hostId, amount, status } = req.body;
        const host = await userModel.findById(hostId);
        if (!host) {
            return res.status(404).json({ message: 'Host not found' });
        }
 
        const withdrawRequest = new withdrawRequestModels({
            host,
            amount, 
            status,
        });

        await withdrawRequest.save();
        // Create notification
        await Notification.create({
            recipient: host,
            type: 'New Withdraw Request',
            content: `Host ${host.name} has requested a withdrawal of $${amount}`,
        });

        res.status(201).json(withdrawRequest);
    } catch (error) {
        console.error('Error creating withdraw request:', error);
        res.status(500).json({ message: 'Error creating withdraw request', error: error.message });
    }
};



export const getAllWithdrawRequests = async (req: Request, res: Response) => {
    try {
        const withdrawRequests = await withdrawRequestModels.find().sort({ createdAt: -1 });
        res.status(200).json(withdrawRequests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching withdraw requests', error });
    }
};


export const updateWithdrawRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason, hostId } = req.body;

        const withdrawRequest = await withdrawRequestModels.findById(id);

        if (!withdrawRequest) {
            return res.status(404).json({ message: 'Withdraw request not found' });
        }

        withdrawRequest.status = status;
        withdrawRequest.reason = reason;

        if (status === 'Approved') {
            const user = await userModel.findById(withdrawRequest.host._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.payouts.push({
                amount: withdrawRequest.amount,
                date: Date.now(),
                status: withdrawRequest.status
            });

            await user.save();
        }

        await withdrawRequest.save();

        // Notify host about the status update
        await Notification.create({
            recipient: hostId,
            type: 'Withdraw Request Update',
            content: `Your withdraw request for $${withdrawRequest.amount} has been ${status.toLowerCase()}${reason ? `. Reason: ${reason}` : ''}`
        });

        res.status(200).json(withdrawRequest);
    } catch (error) {
        res.status(500).json({ message: 'Error updating withdraw request', error });
    }
};

// get Admin Payouts
export const getMyPayouts = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;

        const user = await userModel.findById(userId).select('payouts');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const payouts = user.payouts.map((payout: any) => ({
            id: payout._id,
            amount: payout.amount,
            status: payout.status,
            date: new Date(payout.date).toISOString()
        }));

        const totalSum = payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);

        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                payouts: payouts,
                totalSum: totalSum
            }
        });
    } catch (error) {
        console.error('Error fetching user payouts:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const downloadRecentPayouts = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const user = await userModel.findById(userId).select('payouts');

        console.log(user)

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const recentPayouts = user.payouts.filter((payout: any) => new Date(payout.date) >= oneMonthAgo);

        if (recentPayouts.length === 0) {
            return res.status(404).json({ success: false, message: 'No recent payouts found' });
        }

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'id', title: 'ID' },
                { id: 'amount', title: 'Amount' },
                { id: 'status', title: 'Status' },
                { id: 'date', title: 'Date' }
            ]
        });

        const csvData = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(recentPayouts);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=recent_payouts.csv');
        res.status(200).send(csvData);
    } catch (error) {
        console.error('Error downloading recent payouts:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


export const getAllUsersTotalPayoutSum = async (req: Request, res: Response) => {
    try {
      const totalPayout = await userModel.aggregate([
        {
          $unwind: "$payouts"
        },
        {
          $group: {
            _id: null,
            totalPayout: { $sum: "$payouts.amount" }
          }
        }
      ]);
  
      res.json({ totalPayout: totalPayout[0].totalPayout });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching total payout' });
    }
  };

// src/controllers/payoutController.ts

export const getPayoutSummary = async (req: Request, res: Response) => {
    try {
        // Calculate total payout sum for admin
        const totalPayoutSum = await userModel.aggregate([
            { $unwind: '$payouts' },
            { $match: { 'payouts.status': 'Approve' } },
            { $group: { _id: null, totalSum: { $sum: '$payouts.amount' } } }
        ]);

        console.log(totalPayoutSum, "gdgd")

        // Calculate monthly payout sum for each user
        const userMonthlySums = await userModel.aggregate([
            { $unwind: '$payouts' },
            { $match: { 'payouts.status': 'Approve' } },
            {
                $addFields: {
                    'payouts.dateAsDate': { $toDate: '$payouts.date' }
                }
            },
            {
                $group: {
                    _id: {
                        userId: '$_id',
                        year: { $year: '$payouts.dateAsDate' },
                        month: { $month: '$payouts.dateAsDate' }
                    },
                    monthlySum: { $sum: '$payouts.amount' },
                    userName: { $first: '$name' }
                }
            },
            {
                $group: {
                    _id: '$_id.userId',
                    userName: { $first: '$userName' },
                    monthlySums: {
                        $push: {
                            year: '$_id.year',
                            month: '$_id.month',
                            sum: '$monthlySum'
                        }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalPayoutSum: totalPayoutSum[0]?.totalSum || 0,
                userMonthlySums
            }
        });
    } catch (error) {
        console.error('Error calculating payout summary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};