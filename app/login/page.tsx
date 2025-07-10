"use client";

import { Button, Card, CardBody, CardFooter, Input } from "@nextui-org/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async () => {
    setError("");
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify({ username, knowledgeId: data.knowledgeId }));
        router.push("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed");
      }
    } catch (e) {
      setError("An error occurred during login");
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col mr-10 justify-center items-center bg-gradient-to-br from-indigo-100 to-indigo-300">
      <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 p-6">
        <div className="flex-1 flex flex-col justify-center text-[#18181b] p-10 rounded-xl">
          <h1 className="text-4xl font-bold mb-4">AI-Powered Education</h1>
          <p className="text-lg mb-4">
            Unlock a world of personalized learning with our AI tutors. Powered by cutting-edge technology, our platform adapts to your needs, providing tailored educational experiences.
          </p>
          <ul className="list-disc text-md">
            <li>Interactive lessons with real-time feedback</li>
            <li>Knowledge bases customized to your interests</li>
            <li>Engage with AI avatars that make learning fun</li>
          </ul>
        </div>
        <Card className="w-full md:w-[400px] shadow-lg">
          <CardBody className="flex flex-col gap-4 p-6">
            <h2 className="text-2xl font-bold text-center text-indigo-700">Welcome Back</h2>
            <p className="text-center text-gray-600">Login to your AI Tutor</p>
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="bordered"
              className="w-full"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="bordered"
              className="w-full"
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </CardBody>
          <CardFooter className="p-6 pt-0">
            <Button
              className="w-full bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white font-semibold"
              onClick={handleLogin}
            >
              Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}