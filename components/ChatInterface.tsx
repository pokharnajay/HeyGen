"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  Input,
  Button,
  Divider,
  Spinner,
} from "@nextui-org/react";
import { toast } from "react-toastify";
import Markdown from "react-markdown";
import { OpenAI } from "openai";
import { PaperClipIcon, PhotoIcon } from "@heroicons/react/24/outline";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";


const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: For production, use server-side API calls
});

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  imageUrl?: string;
  files?: { name: string; content: string }[];
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! How can I assist you today?" },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageMode, setIsImageMode] = useState<boolean>(false);
  const [isParsingFiles, setIsParsingFiles] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 3) {
      toast.error("You can upload up to 3 files at a time.");
      return;
    }

    setIsParsingFiles(true);

    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const parsedFiles: { name: string; content: string }[] = [];

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        continue;
      }

      let content = "";
      try {
        if (file.type === "text/plain") {
          content = await file.text();
        } else {
          content = `Uploaded file: ${file.name}`; // Placeholder for non-text files
        }
        parsedFiles.push({ name: file.name, content });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}.`);
      }
    }

    if (parsedFiles.length > 0) {
      setUploadedFiles(parsedFiles);
      const fileNames = parsedFiles.map((file) => file.name).join(", ");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Uploaded files: ${fileNames}` },
      ]);
    }

    setIsParsingFiles(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
  
    const userMessage: Message = {
      role: "user",
      content: input,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setUploadedFiles([]); // Clear files after sending
  
    try {
      if (isImageMode) {
        const imageResponse = await openai.images.generate({
          prompt: input,
          n: 1,
          size: "1024x1024",
        });
        if (imageResponse.data?.[0]?.url) {
          const imageUrl = imageResponse.data[0].url;
          const assistantMessage: Message = {
            role: "assistant",
            content: "",
            imageUrl,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          throw new Error("No image URL received from OpenAI.");
        }
      } else {
        // Explicitly type the messages array for the API call
        const apiMessages: ChatCompletionMessageParam[] = [
          ...messages.map((msg) => {
            if (msg.role === "user") {
              return {
                role: "user",
                content: msg.content,
              } as ChatCompletionMessageParam;
            } else {
              // Assuming assistant for all non-user roles in your initial messages
              return {
                role: "assistant",
                content: msg.content,
              } as ChatCompletionMessageParam;
            }
          }),
          {
            role: "user",
            content: input,
          } as ChatCompletionMessageParam,
          ...uploadedFiles.map((file) => ({
            role: "user",
            content: `Reference data from file ${file.name}: ${file.content}`,
          }) as ChatCompletionMessageParam),
        ];
  
        const completion = await openai.chat.completions.create({
          model: "o3-mini",
          messages: apiMessages,
        });
        const assistantMessage: Message = {
          role: "assistant",
          content: completion.choices[0].message.content || "No response.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error in handleSend:", error);
      if (isImageMode) {
        toast.error("Failed to generate image. Check API key or prompt.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm unable to create images directly. However, I can provide guidance on how to create one yourself. Let me know if you'd like tips!",
          },
        ]);
      } else {
        toast.error("Failed to get a response from the AI.");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, something went wrong." },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full rounded-2xl">
      <CardBody className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => {
          const isImage = Boolean(msg.imageUrl);
          const paddingClass = isImage ? "p-1" : "p-3";
          return (
            <div key={index} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block ${paddingClass} rounded-lg ${
                  msg.role === "user" ? "bg-indigo-500 text-white" : "bg-gray-200 text-black"
                }`}
              >
                {msg.role === "assistant" ? <Markdown>{msg.content}</Markdown> : msg.content}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Generated"
                    className="mt-2 rounded-lg max-h-[256px]"
                  />
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="text-left mb-4">
            <Spinner size="sm" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardBody>
      <Divider />
      <CardFooter className="h-fit flex items-center p-4">
        <div className="w-full flex items-center">
          {isParsingFiles ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <label className="mr-2">
              <PaperClipIcon className="w-6 h-6 text-indigo-500 cursor-pointer" />
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                className="hidden"
                onChange={handleFileUpload}
                multiple
              />
            </label>
          )}
          <div
            onClick={() => setIsImageMode(!isImageMode)}
            className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 ${
              isImageMode ? "bg-white shadow-md" : "bg-transparent"
            }`}
          >
            <PhotoIcon className="w-6 h-6 text-indigo-500" />
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 ml-2"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            className="ml-2 bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" color="white" /> : "Send"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;