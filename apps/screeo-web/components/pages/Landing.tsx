'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export const LandingPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        console.log("welcome to screeo!!");
    } , [authLoading])

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
        <div className="flex justify-center gap-5 items-center">
            <div onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
            }} className="bg-black text-white font-bold mt-10 p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition-all duration-300">
                Sign In With Google
            </div>

            {isAuthenticated && (
                <div onClick={handleLogout} className="bg-red-600 text-white font-bold mt-10 p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition-all duration-300">
                    LogOut
                </div>
            )}

        </div>
    )
}