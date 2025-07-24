'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CreateRoomLobbyModal } from "../modals/Lobby-CreateRoom";
import { JoinRoomLobbyModal } from "../modals/Lobby-JoinRoom";

export const LandingPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    const [isCreateRoomLobbyOpen, setIsCreateRoomLobbyOpen] = useState(false);
    const [isJoinRoomLobbyOpen, setIsJoinRoomLobbyOpen] = useState(false);

    const [username, setUsername] = useState("");

    useEffect(() => {
        console.log("welcome to screeo!!");
    }, [authLoading])

    // Check if user is authenticated
    useEffect(() => {
        const checkSession = async () => {
            setAuthLoading(true);
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/session`, {
                    withCredentials: true,
                });
                if (response.data.message.isAuthenticated) {
                    setIsAuthenticated(true);
                    setUsername(response.data.message.user.username);
                }
            } catch (error) {
                console.error("Session check failed:", error);
                setIsAuthenticated(false);
            } finally {
                setAuthLoading(false);
            }
        };
        checkSession();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/logout`, {}, { withCredentials: true });
            // setIsLoggedIn(false);
            router.push("/");
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    return (
        <div className="flex flex-col justify-center gap-5 items-center">

            <div>
                <CreateRoomLobbyModal
                    open={isCreateRoomLobbyOpen}
                    onClose={() => setIsCreateRoomLobbyOpen(false)}
                    onSwitchToJoinRoomLobby={() => {
                        setIsCreateRoomLobbyOpen(false);
                        setIsJoinRoomLobbyOpen(true);
                    }}
                />
                <JoinRoomLobbyModal
                    open={isJoinRoomLobbyOpen}
                    onClose={() => setIsJoinRoomLobbyOpen(false)}
                    onSwitchToCreateRoomLobby={() => {
                        setIsCreateRoomLobbyOpen(false);
                        setIsJoinRoomLobbyOpen(true);
                    }}
                />
            </div>

            <div className="flex space-x-5">
                {!isAuthenticated ? (
                    <div onClick={() => {
                        window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
                    }} className="bg-black text-white font-bold mt-10 p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition-all duration-300">
                        Sign In With Google
                    </div>
                ) : (
                    <div className="flex flex-col justify-center mt-10 items-center">
                        <div className="text-xl font-bold">
                            Welcome <span className="font-extrabold"> {username}! </span>
                        </div>

                        <div onClick={handleLogout} className="bg-red-600 text-white font-bold p-3 rounded-xl hover:bg-red-700 cursor-pointer transition-all duration-300">
                            LogOut
                        </div>
                    </div>
                )}
            </div>


            <div className="mt-40 flex space-x-5">
                <div onClick={() => setIsCreateRoomLobbyOpen(true)} className="bg-blue-700 text-white font-bold p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition-all duration-300">
                    Create a Meeting
                </div>
                <div onClick={() => setIsJoinRoomLobbyOpen(true)} className="bg-purple-600 text-white font-bold p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition-all duration-300">
                    Join a Meeting
                </div>
            </div>

        </div>
    )
}