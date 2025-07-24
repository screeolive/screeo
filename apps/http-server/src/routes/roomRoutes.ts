import { Router } from 'express';
import { createRoom, getRoomDetails } from '../controllers/roomControllers';
import { optionalAuth } from '../middlewares/userAuthentication';

export const RoomRouter = Router();

// Endpoint to create a new room. Can be accessed by guests or logged-in users.
RoomRouter.post('/', optionalAuth, createRoom);

// Endpoint to get details about a specific room.
RoomRouter.get('/:roomId', getRoomDetails);