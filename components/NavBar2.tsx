"use client";

import { usePathname, useRouter } from "next/navigation";
import { Switch } from "@nextui-org/react";

export default function Navbar2() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitchChange = (isSelected: boolean) => {
    if (isSelected) {
      router.push("/chat");
    } else {
      router.push("/");
    }
  };

  return (
    <header className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500 to-indigo-300 text-white">
      <h1 className="text-2xl font-bold">Edulytics</h1>
      <div className="flex items-center space-x-4">
        <span className="text-lg">Voice Mode</span>
        <Switch
          checked={pathname === "/chat"}
          onChange={(e) => handleSwitchChange(e.target.checked)}
          color="primary"
        />
        <span className="text-lg">Chat Mode</span>
      </div>
    </header>
  );
}