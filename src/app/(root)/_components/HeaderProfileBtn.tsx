"use client";
import Loginbutton from "@/components/Loginbutton";
import { SignedOut, UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";

function HeaderProfileBtn() {
  return (
    <>
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Link
            label="Profile"
            labelIcon={<User className="size-4" />}
            href="/profile"
          />
        </UserButton.MenuItems>
      </UserButton>

      <SignedOut>
        <Loginbutton />
      </SignedOut>
    </>
  );
}
export default HeaderProfileBtn;