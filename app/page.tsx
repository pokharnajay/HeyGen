"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";
import { Button } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function App() {
  const [user, setUser] = useState<{ username: string; knowledgeId: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null; // Or add a loading spinner

  return (
    <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-indigo-100 to-indigo-300">
      <header className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500 to-indigo-300 text-white">
        <h1 className="text-xl font-semibold">Welcome, {user.username}</h1>
        <Button
          className="bg-white text-indigo-500 font-semibold"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full h-full max-h-[80vh] bg-white rounded-lg shadow-lg p-6">
          <InteractiveAvatar knowledgeId={user.knowledgeId} />
        </div>
      </main>
    </div>
  );
}