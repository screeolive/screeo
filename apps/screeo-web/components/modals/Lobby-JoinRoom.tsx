import { CloseCircle } from "@/icons/CloseCircle";
import { useEffect, useRef } from "react";

interface JoinRoomLobbyProps {
    open: boolean;
    onClose: () => void;
    onSwitchToCreateRoomLobby: () => void;
}

export const JoinRoomLobbyModal = ({ open, onClose, onSwitchToCreateRoomLobby }: JoinRoomLobbyProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, onClose]);



    return (
        <>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-4">
                    {/* Modal Container - now properly centered */}
                    <div className="mx-auto w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[800px] px-4">
                        <div className="bg-white p-4 rounded-2xl w-full max-h-[90vh] h-auto md:h-[850px] overflow-y-auto">
                            {/* Close Button - Adjusted for mobile */}
                            <div className="flex justify-end cursor-pointer sticky top-0 bg-white pb-2">
                                <div onClick={onClose} className="p-1">
                                    <CloseCircle className="size-6 md:size-10 hover:text-red-500 transition-all duration-300" />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="flex justify-center mt-2 md:mt-0">
                                <span className="bg-gradient-to-r text-xl md:text-4xl text-center font-extrabold from-blue-600 to-cyan-600 bg-clip-text text-transparent decoration-cyan-800 cursor-pointer hover:underline">
                                    Join a Meeting
                                </span>
                            </div>

                            {/* Form */}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};