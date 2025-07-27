import Image from "next/image"
import Link from "next/link"
import { Button } from "./buttons/Button"

export const Navbar = () => {
    return (
        <div className="flex flex-col md:flex-row justify-around items-center">
            <div>
                <Link href={"/"}>
                    <Image
                        src={"/screeo-full.png"}
                        alt="screeo logo"
                        width={200}
                        height={200}
                        className="hover:scale-105 transition-all duration-500"
                    />
                </Link>
            </div>

            <div>
                <Button text="Sign up for free" colorVariant="white" sizeVariant="medium" hoverVariant="white_1"/>
            </div>
        </div>
    )
}