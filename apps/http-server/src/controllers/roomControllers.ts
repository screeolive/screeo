import { Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import prisma from '../db/prisma'; // Your Prisma client instance

// Generate human-readable, unique room IDs like "abc-def-ghi"
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 9);
const generateRoomId = () => `${nanoid(3)}-${nanoid(3)}-${nanoid(3)}`;

/**
 * Creates a new meeting room.
 * This is called when a user clicks "Create Meeting" in the lobby modal.
 */
export const createRoom = async (req: Request, res: Response) => {
    // Note: We assume an auth middleware has run and attached `req.user` if logged in.
    const user = (req as any).user; // from your auth middleware
    const { guestName } = req.body;

    // A user must be logged in OR provide a guest name.
    if (!user && !guestName) {
        return res.status(400).json({ message: 'Guest name is required for non-authenticated users.' });
    }

    try {
        const roomId = generateRoomId();

        if (user) {
            // --- Authenticated User Flow ---
            // We create the Room and the first Participant (the host) in a single, atomic transaction.
            // If one part fails, the whole operation is rolled back.
            await prisma.$transaction(async (tx) => {
                const newRoom = await tx.room.create({
                    data: {
                        id: roomId,
                        hostId: user.id, // The logged-in user is the host
                    },
                });

                await tx.participant.create({
                    data: {
                        roomId: newRoom.id,
                        userId: user.id,
                    },
                });
            });

            console.log(`Authenticated user ${user.username} (${user.id}) created room ${roomId}`);
            return res.status(201).json({ roomId });

        } else {
            // --- Guest User Flow ---
            // For guests, we create a temporary "placeholder" user and a room.
            // This allows them to participate without full registration.

            // Generate a unique identifier for the guest
            const guestId = `guest_${customAlphabet('1234567890abcdef', 12)()}`;

            await prisma.$transaction(async (tx) => {
                // Create a placeholder user for the guest
                const guestUser = await tx.user.create({
                    data: {
                        id: guestId,
                        email: `${guestId}@screeo.guest`, // Guest users have a unique, non-functional email
                        username: guestName,
                        password: '', // No password for guests
                        provider: 'guest',
                    },
                });

                const newRoom = await tx.room.create({
                    data: {
                        id: roomId,
                        hostId: guestUser.id, // The guest is the host of their room
                    },
                });

                await tx.participant.create({
                    data: {
                        roomId: newRoom.id,
                        userId: guestUser.id,
                    },
                });
            });

            console.log(`Guest "${guestName}" created room ${roomId}`);
            return res.status(201).json({ roomId, guestId }); // Return guestId so frontend can use it
        }

    } catch (error) {
        console.error("Failed to create room:", error);
        return res.status(500).json({ message: "An error occurred while creating the room." });
    }
};

/**
 * Gets details for a specific room.
 * Useful for the lobby to verify a room exists before trying to join.
 */
export const getRoomDetails = async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: {
                        username: true,
                    },
                },
                participants: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            }
                        }
                    }
                }
            },
        });

        if (!room) {
            return res.status(404).json({ message: "Room not found." });
        }

        return res.status(200).json(room);

    } catch (error) {
        console.error("Failed to get room details:", error);
        return res.status(500).json({ message: "An error occurred." });
    }
};