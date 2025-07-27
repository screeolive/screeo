'use client';

import { Phone } from "@/icons/Phone";
import { Button } from "../ui/buttons/Button";

export const LandingPage = () => {
    return (
        <div className="flex justify-center items-center bg-[#08090a] text-[#eaf2ef] h-screen">
            <Button text="LogIn" colorVariant="yellow" hoverVariant="yellow_1" sizeVariant="large" endIcon={<Phone className="size-5"/>}/>
        </div>
    )
}