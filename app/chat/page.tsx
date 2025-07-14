"use client";

import ChatInterface from "@/components/ChatInterface";
import { Button } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const [user, setUser] = useState<{ username: string; knowledgeId: string } | null>(null);
  const router = useRouter();
  const [isVoiceMode, setIsVoiceMode] = useState(false);

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

  const toggleMode = () => {
    setIsVoiceMode(!isVoiceMode);
    router.push(isVoiceMode ? "/chat" : "/");
  };

  if (!user) return null;

  return (
    <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-indigo-100 to-indigo-300">
      <header className="flex justify-between items-center p-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-300 text-white">
        <h1 className="text-xl font-semibold">Welcome, {user.username}</h1>
        <div className="flex items-center gap-4">
          <div
            className="relative inline-flex items-center cursor-pointer"
            onClick={toggleMode}
          >
            <span className="text-sm mr-2">Chat</span>
            <div
              className="w-14 h-7 bg-gray-300 rounded-full p-1 transition-all duration-300 ease-in-out"
              style={{
                background: isVoiceMode
                  ? "linear-gradient(to right, #6366F1, #A78BFA)"
                  : "#D1D5DB",
              }}
            >
              <div
                className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out"
                style={{
                  transform: isVoiceMode ? "translateX(28px)" : "translateX(2px)",
                }}
              />
            </div>
            <span className="text-sm ml-2">Voice</span>
          </div>
          <Button
            className="bg-white text-indigo-500 font-semibold shadow-md hover:shadow-lg transition-shadow"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>
      <main className="h-[80vh] items-center justify-center px-6">
        <div className="w-full h-full bg-transparent mt-5">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}