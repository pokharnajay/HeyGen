"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader } from "@nextui-org/react";
import InteractiveAvatar from "@/components/InteractiveAvatar";
import { AVATARS } from "@/app/lib/constants";

export default function ChatPage() {
  const router = useRouter();
  const [knowledgeId, setKid]  = useState<string | null>(null);
  const [avatarId,    setAid]  = useState<string | null>(null);
  const username               = typeof window !== "undefined" ? sessionStorage.getItem("username") : null;

  useEffect(() => {
    const kid = sessionStorage.getItem("knowledgeId");
    if (!kid || !username) { router.replace("/login"); return; }

    setKid(kid);

    // choose a random avatar
    const random = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    setAid(random.avatar_id);
  }, [router, username]);

  function handleLogout() {
    sessionStorage.clear();
    router.push("/login");
  }

  if (!knowledgeId || !avatarId) return null;                 // still loading

  return (
    <div className="w-screen h-screen flex flex-col items-center pt-4">
      <Card className="w-[900px] mb-4">
        <CardHeader className="flex justify-between items-center px-6 py-4">
          <span className="text-lg font-medium">Welcome, {username}</span>
          <Button onClick={handleLogout} size="sm" className="bg-red-500 text-white">
            Logout
          </Button>
        </CardHeader>
      </Card>

      {/* Pass avatarId + knowledgeId directly — dropdown removed inside */}
      <InteractiveAvatar defaultAvatar={avatarId} defaultKnowledge={knowledgeId} hideSelectors />
    </div>
  );
}
