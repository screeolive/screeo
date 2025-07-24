"use client"; // This is a client component

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// --- Types and Interfaces ---
interface Participant {
    id: string;
    username: string;
    stream?: MediaStream | null;
    isMuted?: boolean;
}

// --- Icons (Same as before) ---
const MicOnIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>;
const MicOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" x2="23" y1="1" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" x2="12" y1="19" y2="22" /></svg>;
const ScreenShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="m7 15 5-5 5 5" /><path d="M12 10v9" /><path d="M17 8h4v4" /><path d="m21 8-9 9" /></svg>;
const ScreenShareOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17h-2l-2-2m-2-2-2-2L1 1l22 22" /><path d="M11 11.25V15h3.75" /><path d="M15 19H5a2 2 0 0 1-2-2V7c0-1 .4-1.9 1-2.6" /><path d="M21 12V5a2 2 0 0 0-2-2h-7" /></svg>;
const EndCallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.64 14.36a9 9 0 0 1-12.23-2.62 4 4 0 0 1-1.2-4.09A9 9 0 0 1 8.86.36a4 4 0 0 1 5.48 1.94 9 9 0 0 1 1.3 9.7z" /><path d="m2.16 16.3 3.32 3.32a4 4 0 0 0 5.66 0l3.32-3.32a4 4 0 0 0 0-5.66l-3.32-3.32a4 4 0 0 0-5.66 0l-3.32 3.32a4 4 0 0 0 0 5.66z" /></svg>;

// --- Main Room Component ---
export const RoomComponent = ({ params }: { params: { id: string } }) => {
    const roomId = params.id;
    const router = useRouter();
    const [participants, setParticipants] = useState<Record<string, Participant>>({});
    const [userId, setUserId] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('Guest');

    const [isMicOn, setIsMicOn] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<Record<string, RTCPeerConnection>>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    // Fetch user session to get ID and username
    useEffect(() => {
        axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/session`, { withCredentials: true })
            .then(res => {
                if (res.data?.message?.isAuthenticated) {
                    setUserId(res.data.message.user.id);
                    setUsername(res.data.message.user.username);
                } else {
                    const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
                    setUserId(guestId);
                    // You might want to get guest's name from query params in the future
                    setUsername(sessionStorage.getItem('guestName') || `Guest-${guestId.substring(0, 4)}`);
                }
            }).catch(() => {
                const guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
                setUserId(guestId);
                setUsername(sessionStorage.getItem('guestName') || `Guest-${guestId.substring(0, 4)}`);
            });
    }, []);

    const createPeerConnection = useCallback((peerId: string) => {
        if (peersRef.current[peerId]) return peersRef.current[peerId];

        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // **FIX**: Add onnegotiationneeded to automatically handle screen sharing
        peer.onnegotiationneeded = async () => {
            console.log("Negotiation needed for peer:", peerId);
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socketRef.current?.emit('offer', { to: peerId, offer });
            } catch (err) {
                console.error("Error creating offer:", err);
            }
        };

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit('ice-candidate', { to: peerId, candidate: event.candidate });
            }
        };

        peer.ontrack = (event) => {
            setParticipants(prev => {
                const existingParticipant = prev[peerId] || { id: peerId, username: 'New User' };
                return {
                    ...prev,
                    [peerId]: { ...existingParticipant, stream: event.streams[0] }
                };
            });
        };

        localStreamRef.current?.getTracks().forEach(track => {
            peer.addTrack(track, localStreamRef.current!);
        });

        peersRef.current[peerId] = peer;
        return peer;
    }, []);

    useEffect(() => {
        if (!userId || !username) return;

        const socket = io(process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001');
        socketRef.current = socket;

        setParticipants(prev => ({ ...prev, [userId]: { id: userId, username, stream: localStreamRef.current, isMuted: !isMicOn } }));

        // **FIX**: Send username to the server
        socket.emit('join-room', roomId, userId, username);

        // **FIX**: Now receives a participant object with id and username
        const handleUserConnected = (participant: { id: string, username: string }) => {
            console.log(`User connected: ${participant.username} (${participant.id})`);
            setParticipants(prev => ({ ...prev, [participant.id]: participant }));
            createPeerConnection(participant.id);
        };

        // **FIX**: Now receives an array of participant objects
        const handleExistingUsers = (participants: Participant[]) => {
            console.log("Existing users in room:", participants);
            for (const participant of participants) {
                setParticipants(prev => ({ ...prev, [participant.id]: participant }));
                const peer = createPeerConnection(participant.id);
                // The onnegotiationneeded event will handle creating the offer
            }
        };

        const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
            const peer = createPeerConnection(from);
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer', { to: from, answer });
        };

        const handleAnswer = async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
            const peer = peersRef.current[from];
            if (peer) {
                await peer.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        const handleIceCandidate = (data: { candidate: RTCIceCandidateInit; from: string }) => {
            const peer = peersRef.current[data.from];
            if (peer) {
                peer.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };

        const handleUserDisconnected = (disconnectedUserId: string) => {
            if (peersRef.current[disconnectedUserId]) {
                peersRef.current[disconnectedUserId].close();
                delete peersRef.current[disconnectedUserId];
            }
            setParticipants(prev => {
                const newParticipants = { ...prev };
                delete newParticipants[disconnectedUserId];
                return newParticipants;
            });
        };

        socket.on('user-connected', handleUserConnected);
        socket.on('existing-users', handleExistingUsers);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-disconnected', handleUserDisconnected);

        return () => {
            socket.disconnect();
            Object.values(peersRef.current).forEach(peer => peer.close());
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [userId, roomId, createPeerConnection, username]);

    const toggleMedia = useCallback(async (type: 'mic' | 'screen') => {
        const isCurrentlyOn = type === 'mic' ? isMicOn : isSharingScreen;
        const setOn = type === 'mic' ? setIsMicOn : setIsSharingScreen;

        const currentStream = localStreamRef.current ?? new MediaStream();
        const trackKind = type === 'mic' ? 'audio' : 'video';
        const existingTrack = currentStream.getTracks().find(t => t.kind === trackKind);

        if (existingTrack) {
            existingTrack.stop();
            currentStream.removeTrack(existingTrack);
            Object.values(peersRef.current).forEach(peer => {
                const sender = peer.getSenders().find(s => s.track === existingTrack);
                if (sender) peer.removeTrack(sender);
            });
        }

        if (!isCurrentlyOn) {
            try {
                const newMediaStream = type === 'mic'
                    ? await navigator.mediaDevices.getUserMedia({ audio: true })
                    : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });

                const newTrack = newMediaStream.getTracks()[0];
                currentStream.addTrack(newTrack);
                Object.values(peersRef.current).forEach(peer => {
                    peer.addTrack(newTrack, currentStream);
                });

                if (type === 'screen') newTrack.onended = () => toggleMedia('screen');

                setOn(true);
            } catch (e) { console.error(`Error starting ${type}:`, e); return; }
        } else {
            setOn(false);
        }

        localStreamRef.current = currentStream;
        setParticipants(prev => ({ ...prev, [userId!]: { ...prev[userId!], stream: currentStream, isMuted: type === 'mic' ? !isCurrentlyOn : prev[userId!]?.isMuted } }));
    }, [isMicOn, isSharingScreen, userId, username]);

    const handleLeaveRoom = () => router.push('/');

    const participantIds = Object.keys(participants);
    const gridLayout = () => {
        const count = participantIds.length;
        if (count <= 1) return 'grid-cols-1';
        if (count <= 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2 grid-rows-2';
        if (count <= 6) return 'grid-cols-3 grid-rows-2';
        return 'grid-cols-3 grid-rows-3';
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <main className={`flex-1 grid gap-4 p-4 ${gridLayout()} overflow-auto`}>
                {participantIds.map(pId => (
                    <VideoPlayer key={pId} participant={participants[pId]} isLocal={pId === userId} />
                ))}
            </main>
            <footer className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm p-4 flex justify-center items-center gap-4 border-t border-gray-700">
                <ControlButton onClick={() => toggleMedia('mic')} isOn={isMicOn}>
                    {isMicOn ? <MicOnIcon /> : <MicOffIcon />}
                </ControlButton>
                <ControlButton onClick={() => toggleMedia('screen')} isOn={isSharingScreen}>
                    {isSharingScreen ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
                </ControlButton>
                <ControlButton onClick={handleLeaveRoom} isDanger>
                    <EndCallIcon />
                </ControlButton>
            </footer>
        </div>
    );
};

// --- Child Components ---
const VideoPlayer = ({ participant, isLocal }: { participant: Participant, isLocal: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream;
        }
    }, [participant.stream]);

    return (
        <div className="bg-black rounded-lg overflow-hidden relative shadow-lg">
            <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-contain" />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm font-semibold">
                {participant.username} {isLocal && "(You)"}
            </div>
        </div>
    );
};

const ControlButton = ({ children, onClick, isOn = false, isDanger = false }: { children: React.ReactNode, onClick: () => void, isOn?: boolean, isDanger?: boolean }) => {
    const baseClasses = 'p-3 rounded-full text-white transition-all duration-200 ease-in-out transform hover:scale-110';
    const onClasses = 'bg-gray-600 hover:bg-gray-500';
    const offClasses = 'bg-blue-600 hover:bg-blue-500';
    const dangerClasses = 'bg-red-600 hover:bg-red-500';
    const classes = `${baseClasses} ${isDanger ? dangerClasses : isOn ? offClasses : onClasses}`;

    return <button onClick={onClick} className={classes}>{children}</button>;
};
