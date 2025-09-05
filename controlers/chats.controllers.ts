// import { Request, Response } from 'express';
// import messagesModel, { IMessage } from '../models/messages.model';
// import { solutionModel } from '../models/solution.models';
// import { roomModel } from '../models/roomModel';


// export const sendMessage2 = async (req: Request, res: Response) => {
//   try {
//     const { roomId, message, sender } = req.body;

//     if (!roomId || !message || !sender) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     console.log('Received message:', { roomId, message, sender });
    
//     // Check if the message matches any predefined solution
//     const solution = await solutionModel.findOne({ 
//       keyword: { $regex: new RegExp(message, 'i') } 
//     });

//     let newMessage: IMessage;

//     if (solution) {
//       // If a solution is found, create an AI message with the solution
//       newMessage = new messagesModel({
//         roomId,
//         sender: 'AI',
//         message: solution.response,
//         isAI: true,
//         solutionId: solution._id,
//       });
//     } else {
//       // If no solution is found, create a regular user message
//       newMessage = new messagesModel({
//         roomId,
//         sender,
//         message,
//         isAI: false,
//       });
//     }

//     await newMessage.save();

//     console.log('New message saved:', newMessage);

//     // Emit the new message to all clients in the room
//     if (req.app.get('io')) {
//       req.app.get('io').to(roomId).emit('new_message', newMessage);
//       console.log('Message emitted to room:', roomId);
//     } else {
//       console.warn('Socket.io not initialized');
//     }

//     res.status(201).json(newMessage);
//   } catch (error) {
//     console.error('Error sending message:', error);
//     res.status(500).json({ message: 'Error sending message', error: error.message });
//   }
// };


// export const getMessages = async (req: Request, res: Response) => {
//   try {
//     const { roomId } = req.params;
//     const messages = await messagesModel.find({ roomId }).sort({ createdAt: 1 });
//     res.status(200).json(messages);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching messages', error });
//   }
// };

// export const getActiveChats = async (req: Request, res: Response) => {
//   try {
//     const activeChats = await messagesModel.aggregate([
//       { $sort: { createdAt: -1 } },
//       { $group: { _id: '$roomId', lastMessage: { $first: '$$ROOT' } } },
//       { $lookup: { from: 'users', localField: 'lastMessage.sender', foreignField: '_id', as: 'user' } },
//       { $unwind: '$user' },
//       { $project: { roomId: '$_id', lastMessage: 1, user: { name: 1, avatar: 1 } } },
//       { $sort: { 'lastMessage.createdAt': -1 } }
//     ]);
//     res.status(200).json(activeChats);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching active chats', error });
//   }
// };


// export const getMessagesForRoom2 = async (req: Request, res: Response) => {
//   try {
//     const { roomId } = req.params;
//     console.log('Fetching messages for room:', roomId);

//     const messages = await messagesModel.find({ roomId }).sort({ createdAt: 1 });

//     if (!messages || messages.length === 0) {
//       console.log('No messages found for room:', roomId);
//       return res.status(404).json({ message: 'No messages found for this room' });
//     }

//     console.log(`Found ${messages.length} messages for room:`, roomId);
//     res.status(200).json(messages);
//   } catch (error) {
//     console.error('Error in getMessagesForRoom:', error);
//     res.status(500).json({ message: 'Error fetching messages', error: error.message });
//   }
// };




// export const getMessagesForRoom = async (req: Request, res: Response) => {
//   try {
//     const { roomId } = req.params;
//     console.log('Fetching messages for room:', roomId);

//     const messages = await messagesModel.find({ roomId }).sort({ createdAt: 1 });

//     if (!messages || messages.length === 0) {
//       console.log('No messages found for room:', roomId);
//       return res.status(200).json({ messages: [] });
//     }

//     console.log(`Found ${messages.length} messages for room:`, roomId);
//     res.status(200).json({ messages });
//   } catch (error) {
//     console.error('Error in getMessagesForRoom:', error);
//     res.status(500).json({ message: 'Error fetching messages', error: error.message });
//   }
// };

// export const sendMessage = async (req: Request, res: Response) => {
//   try {
//     console.log('Received message request:', req.body);
//     const { roomId, message, sender } = req.body;

//     if (!roomId || !message || !sender) {
//       console.log('Missing required fields:', { roomId, message, sender });
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     const room = await roomModel.findById(roomId);
//     if (!room) {
//       console.log('Room not found:', roomId);
//       return res.status(404).json({ message: 'Room not found' });
//     }

//     const newMessage = new messagesModel({
//       roomId,
//       sender,
//       message,
//       isAI: false,
//     });
//     await newMessage.save();
//     console.log('User message saved:', newMessage);

//     const solution = await solutionModel.findOne({ 
//       keyword: { $regex: new RegExp(message, 'i') } 
//     });

//     let aiResponse: IMessage;

//     if (solution) {
//       aiResponse = new messagesModel({
//         roomId,
//         sender: 'AI',
//         message: solution.response,
//         isAI: true,
//         solutionId: solution._id,
//       });
//     } else {
//       aiResponse = new messagesModel({
//         roomId,
//         sender: 'AI',
//         message: "I'm sorry, but I don't have a specific answer for that query. Is there anything else I can help you with?",
//         isAI: true,
//       });
//     }
//     await aiResponse.save();
//     console.log('AI response saved:', aiResponse);

//     if (req.app.get('io')) {
//       req.app.get('io').to(roomId).emit('new_message', newMessage);
//       req.app.get('io').to(roomId).emit('new_message', aiResponse);
//       console.log('Messages emitted to room:', roomId);
//     } else {
//       console.warn('Socket.io not initialized');
//     }

//     res.status(201).json([newMessage, aiResponse]);
//   } catch (error) {
//     console.error('Error in sendMessage:', error);
//     res.status(500).json({ message: 'Error sending message', error: error.message });
//   }
// };

// // ... (other controller methods)



import { Request, Response } from 'express';
import { roomModel } from '../models/roomModel';
import { solutionModel } from '../models/solution.models';
import messagesModel, { IMessage } from '../models/messages.model';


export const createRoom = async (req: Request, res: Response) => {
    try {
        console.log('Received create room request:', req.body);
        const { guestId } = req.body;

        if (!guestId) {
            console.log('Missing guestId');
            return res.status(400).json({ message: 'Missing guestId' });
        }

        // Check if a room already exists for this guestId
        let room = await roomModel.findOne({ guestId });

        if (room) {
            console.log('Room already exists for guest:', guestId);
            return res.status(200).json({ roomId: room._id, message: 'Existing room returned' });
        }

        // If no room exists, create a new one
        room = new roomModel({ guestId });
        await room.save();
        console.log('New room created:', room);

        res.status(201).json({ roomId: room._id, message: 'New room created' });
    } catch (error) {
        console.error('Error in createRoom:', error);
        res.status(500).json({ message: 'Error creating room', error: error.message });
    }
};

export const getRoomForGuest = async (req: Request, res: Response) => {
    try {
        console.log('Received get room request for guest:', req.params.guestId);
        const { guestId } = req.params;

        const room = await roomModel.findOne({ guestId });

        if (!room) {
            console.log('Room not found for guest:', guestId);
            return res.status(404).json({ message: 'Room not found for this guest' });
        }

        console.log('Room found:', room);
        res.status(200).json({ roomId: room._id });
    } catch (error) {
        console.error('Error in getRoomForGuest:', error);
        res.status(500).json({ message: 'Error getting room for guest', error: error.message });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        console.log('Received message request:', req.body);
        const { roomId, message, sender } = req.body;

        if (!roomId || !message || !sender) {
            console.log('Missing required fields:', { roomId, message, sender });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const room = await roomModel.findById(roomId);
        if (!room) {
            console.log('Room not found:', roomId);
            return res.status(404).json({ message: 'Room not found' });
        }

        const solution = await solutionModel.findOne({
            keyword: { $regex: new RegExp(message, 'i') }
        });

        let newMessage: IMessage;
        let aiResponse: IMessage;

        newMessage = new messagesModel({
            roomId,
            sender,
            message,
            isAI: false,
        });
        await newMessage.save();
        console.log('User message saved:', newMessage);

        if (solution) {
            aiResponse = new messagesModel({
                roomId,
                sender: 'AI',
                message: solution.response,
                isAI: true,
                solutionId: solution._id,
            });
        } else {
            aiResponse = new messagesModel({
                roomId,
                sender: 'AI',
                message: "I'm sorry, but I don't have a specific answer for that query. Is there anything else I can help you with?",
                isAI: true,
            });
        }
        await aiResponse.save();
        console.log('AI response saved:', aiResponse);

        if (req.app.get('io')) {
            req.app.get('io').to(roomId).emit('new_message', newMessage);
            req.app.get('io').to(roomId).emit('new_message', aiResponse);
            console.log('Messages emitted to room:', roomId);
        } else {
            console.warn('Socket.io not initialized');
        }

        res.status(201).json([newMessage, aiResponse]);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

export const getMessagesForRoom = async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        console.log('Fetching messages for room:', roomId);

        const messages = await messagesModel.find({ roomId }).sort({ createdAt: 1 });

        if (!messages || messages.length === 0) {
            console.log('No messages found for room:', roomId);
            return res.status(200).json({ messages: [] });
        }

        console.log(`Found ${messages.length} messages for room:`, roomId);
        res.status(200).json({ messages });
    } catch (error) {
        console.error('Error in getMessagesForRoom:', error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
};