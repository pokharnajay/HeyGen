import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskMode,
  TaskType,
  VoiceEmotion,
  STTProvider,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";
import { toast } from "react-toastify";
import { ScaleLoader } from "react-spinners";   // new ⬅️
import Webcam from "react-webcam";
import { FC } from "react";

export interface InteractiveAvatarProps {
  /** PhonicFlow (HeyGen) avatar ID returned by the API */
  defaultAvatar?: string;
  /** Knowledge–base ID that should be loaded by default */
  defaultKnowledge?: string;
  /** Hide the avatar / knowledge selectors when true */
  hideSelectors?: boolean;
}

const InteractiveAvatar: FC<InteractiveAvatarProps> = ({
  defaultAvatar,
  defaultKnowledge,
  hideSelectors = false,

}) => {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("Alessandra_Chair_Sitting_public");
  const [language, setLanguage] = useState<string>("en");
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [studentData, setStudentData] = useState<{
    name: string;
    age: number | string;
    course: string;
    knowledge_id: string;
  }>({
    name: "",
    age: "",
    course: "",
    knowledge_id: "",
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [voiceEmotion, setVoiceEmotion] = useState<VoiceEmotion>(VoiceEmotion.EXCITED);
  const [customPrompt, setCustomPrompt] = useState<string>(
    "Always speak in maximum of 10 words, except only if asked to explain something in detail."
  );
  const [taskType, setTaskType] = useState<TaskType>(TaskType.REPEAT);
  const [avatarSpeech, setAvatarSpeech] = useState<string>("");

  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);

  const appendLog = (message: string) => {
    if (logs.includes("Loaded data for user")) return;
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  function getLoggedInUsername() {
    const storedUser: any = localStorage.getItem("user");
    const username = JSON.parse(storedUser);
    appendLog(`Retrieved username: ${username["username"]}`);
    return username["username"];
  }

  

  useEffect(() => {
    const username = getLoggedInUsername();
    if (!username) {
      setDebug("No logged-in user found");
      appendLog("No logged-in user found");
      return;
    }

    async function loadStudentData() {
      try {
        const response = await fetch(`/api/student-data?username=${username}`);
        if (response.ok) {
          const studentInfo = await response.json();
          setKnowledgeId(studentInfo.knowledge_id);
          setStudentData({
            name: studentInfo.name,
            age: studentInfo.age,
            course: studentInfo.course,
            knowledge_id: studentInfo.new_knowledge_id,
          });
          appendLog(`Loaded data for user: ${username}, Knowledge ID: ${studentInfo.knowledge_id}`);
        } else {
          const errorData = await response.json();
          setDebug(errorData.error || `User ${username} not found in database`);
          appendLog(`Failed to load student data: ${errorData.error}`);
          toast.error("User not found. Please check your credentials.");
        }
      } catch (e) {
        console.error("Error loading student data:", e);
        setDebug("Error loading user data");
        appendLog("Error loading user data");
        toast.error("Error loading user data. Please refresh the page.");
      }
    }

    loadStudentData();
  }, []);

  function baseApiUrl() {
    return process.env.NEXT_PUBLIC_BASE_API_URL;
  }

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to fetch access token");
      const token = await response.text();
      appendLog("Fetched access token");
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      appendLog("Error fetching access token");
      toast.error("Failed to fetch access token. Please try again.");
      return "";
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    appendLog("Starting session");
    const newToken = await fetchAccessToken();

    if (!newToken) {
      setIsLoadingSession(false);
      return;
    }

    avatar.current = new StreamingAvatar({
      token: newToken,
      basePath: baseApiUrl(),
    });

    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      appendLog("Avatar started talking");
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      appendLog("Avatar stopped talking");
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      appendLog("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      appendLog("Stream ready");
      setStream(event.detail);
      setSessionStartTime(Date.now());
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      appendLog("User started talking");
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      appendLog("User stopped talking");
      setIsUserTalking(false);
    });
    avatar.current?.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
      setAvatarSpeech(event.detail?.text || "");
    });
    avatar.current?.on(StreamingEvents.AVATAR_END_MESSAGE, () => {
      setAvatarSpeech("");
    });
    avatar.current?.on(StreamingEvents.USER_SILENCE, () => {
      appendLog("User is silent");
      toast.info("You’ve been silent for a while. Please continue speaking.");
    });

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 0.9,
          emotion: voiceEmotion,
        },
        sttSettings: {
          provider: STTProvider.DEEPGRAM,
          confidence: 0.1,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      await avatar.current?.startVoiceChat({
        useSilencePrompt: false,
        isInputAudioMuted: false,
      } as any);
      setChatMode("voice_mode");

      await avatar.current?.speak({
        text: "Hi there, how can I help you today?",
        taskType: TaskType.TALK,          // TALK works in voice-chat; REPEAT is fine in text-mode
        taskMode: TaskMode.SYNC           // wait until the line finishes
      });

      appendLog("Session started successfully");
    } catch (error) {
      console.error("Error starting avatar session:", error);
      appendLog("Error starting avatar session");
      toast.error("Failed to start session. Check your connection or try again.");
    } finally {
      setIsLoadingSession(false);
    }
  }

  const MAX_CHAR_LIMIT = 500;

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    appendLog("Handling speak request");
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      appendLog("Avatar API not initialized");
      toast.error("Avatar API not initialized");
      setIsLoadingRepeat(false);
      return;
    }

    const trimmedText = text.trim().slice(0, MAX_CHAR_LIMIT);

    try {
      await avatar.current.speak({
        text: trimmedText,
        taskType: taskType,
        taskMode: TaskMode.SYNC,
      });
      appendLog("Speak task completed");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setDebug(errorMsg);
      appendLog(`Speak error: ${errorMsg}`);
      toast.error(`Speak error: ${errorMsg}`);
    } finally {
      setIsLoadingRepeat(false);
    }
  }

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      appendLog("Avatar API not initialized");
      toast.error("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
      appendLog(`Interrupt error: ${e.message}`);
      toast.error(`Interrupt error: ${e.message}`);
    });
    appendLog("Interrupted task");
  }

  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
    setSessionStartTime(null);
    setSessionDuration(0);
    appendLog("Session ended");
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
      appendLog("Switched to text mode");
    } else {
      await avatar.current?.startVoiceChat();
      appendLog("Switched to voice mode");
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
      appendLog("Started listening");
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
      appendLog("Stopped listening");
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
        appendLog("Video stream playing");
      };
    }
  }, [mediaStream, stream]);

  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        const currentTime = Date.now();
        const duration = Math.floor((currentTime - sessionStartTime) / 1000);
        setSessionDuration(duration);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStartTime]);

  const formatSessionDuration = () => {
    if (sessionDuration < 60) {
      return `${sessionDuration} sec`;
    } else {
      const minutes = Math.floor(sessionDuration / 60);
      const seconds = sessionDuration % 60;
      return `${minutes} min ${seconds} sec`;
    }
  };


  const webcamRef = useRef<HTMLVideoElement>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream>();
  useEffect(() => {
    if (webcamStream && webcamRef.current) {
      webcamRef.current.srcObject = webcamStream;
      webcamRef.current.onloadedmetadata = () => webcamRef.current!.play();
    }
  }, [webcamStream]);

  return (
    <div className="w-full h-full max-h-full rounded-2xl">
      <Card className="w-[100%] h-full rounded-2xl">
        <CardBody className="h-[100%] w-full flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-full w-full justify-center items-center flex rounded-lg overflow-hidden relative">
              <div className="grid grid-cols-2 gap-4 flex-1">
                {/* Avatar feed wrapper */}
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={mediaStream}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                {/* Webcam feed wrapper */}
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <Webcam
                    audio={false}
                    mirrored
                    videoConstraints={{
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                      facingMode: "user",
                      aspectRatio: 16 / 9,               // ask the camera for 16 : 9 too
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>
              {avatarSpeech && (
                <div className="absolute bottom-5 left-5 bg-black bg-opacity-50 text-white p-2 rounded">
                  {avatarSpeech}
                </div>
              )}
              <div className="flex flex-col gap-2 absolute bottom-3 right-7">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
              <div className="absolute top-3 left-7">
                <Card className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white p-2">
                  <CardBody className="p-1">
                    <Chip
                      variant="flat"
                      className="bg-white text-indigo-600 font-semibold"
                    >
                      Session: {formatSessionDuration()}
                    </Chip>
                  </CardBody>
                </Card>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full w-full justify-center items-center flex flex-col gap-8 self-center">
              <div className="flex flex-col gap-2 w-full"></div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-[30%] text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start session
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ScaleLoader color="#6366F1" height={35} width={4} radius={2} speedMultiplier={1.2} />  {/* ✅ new loader */}
              <p className="fade-loader-text text-xl font-bold mt-2 text-gray-300">
                Loading your personalised agent&hellip;
              </p>
            </div>
          )}
        </CardBody>
        
        <Divider />
        <CardFooter className="flex flex-col gap-3 h-[25%] relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              handleChangeChatMode(v);
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full h-fit flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSpeak}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : (
            <div className="w-full text-center h-fit">
              <Button
                isDisabled={!isUserTalking}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default InteractiveAvatar