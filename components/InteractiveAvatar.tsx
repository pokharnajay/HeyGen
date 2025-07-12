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
  const [avatarId, setAvatarId] = useState<string>("Wayne_20240711");
  const [language, setLanguage] = useState<string>("en");
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const [chatMode, setChatMode] = useState("voice_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(true);   // ← NEW
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
  const [funFacts, setFunFacts] = useState<string[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  const [factsError, setFactsError] = useState<string>("");

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

  async function fetchFunFacts(course: string, age: string) {
    if (!course || !age) {
      setFactsError("Course or age is missing");
      appendLog("Fun facts fetch skipped: missing course or age");
      return;
    }
    setIsLoadingFacts(true);
    setFactsError("");
    appendLog(`Fetching fun facts, specially for you.`);
    try {
      const response = await fetch("/api/openai-fun-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course, age }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (!data.facts || !Array.isArray(data.facts)) {
        throw new Error("Invalid facts format received");
      }
      setFunFacts(data.facts);
      if (data.facts.length === 0) {
        setFactsError("No fun facts returned from OpenAI");
        appendLog("No fun facts returned from OpenAI");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Fun facts fetch error:", error);
      appendLog(`Fun facts fetch error: ${errorMsg}`);
      setFactsError(errorMsg);
      toast.error(`Failed to fetch fun facts: ${errorMsg}`);
    } finally {
      setIsLoadingFacts(false);
    }
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
          await fetchFunFacts(studentInfo.course, String(studentInfo.age));
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
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setWebcamStream(stream);
      } catch (err) {
        console.error("Webcam access denied:", err);
        appendLog("Webcam access denied");
      }
    })();
  }, []);

  useEffect(() => {
    if (webcamStream && webcamRef.current) {
      webcamRef.current.srcObject = webcamStream;
      webcamRef.current.onloadedmetadata = () => webcamRef.current!.play();
    }
  }, [webcamStream]);


  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",          // front camera on phones
  };


  return (
    <>
      <div className={`w-full h-full max-h-full flex relative ${isLogsOpen ? "gap-4" : "gap-0"}`}>
        <Card className="w-full flex flex-col relative">
          <CardBody className="h-[500px] w-full flex flex-col">
            {/* ─────────── VIDEO GRID ─────────── */}
            {stream ? (
              <>
                {/* VIDEO GRID */}
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


                {/* ─────────── CONTROL BAR ─────────── */}
                <div className="flex items-center justify-between mt-4">
                  <Chip
                    variant="flat"
                    className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white font-semibold"
                  >
                    Session&nbsp;{formatSessionDuration()}
                  </Chip>

                  <div className="flex gap-2">
                    <Button
                      className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                      size="md"
                      variant="shadow"
                      onClick={handleInterrupt}
                    >
                      Interrupt task
                    </Button>
                    <Button
                      className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                      size="md"
                      variant="shadow"
                      onClick={endSession}
                    >
                      End session
                    </Button>
                  </div>
                </div>
              </>
            ) : !isLoadingSession ? (
              /* START-SESSION placeholder (unchanged) */
              <div className="h-full w-full flex flex-col items-center justify-center gap-8">
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
              /* LOADER (unchanged) */
              <div className="flex flex-col items-center gap-3 mt-10">
                <ScaleLoader color="#6366F1" height={35} width={4} radius={2} />
                <p className="text-xl font-bold mt-2 text-gray-300">
                  Loading your personalised agent&hellip;
                </p>
              </div>
            )}
          </CardBody>




          <div className="flex flex-1 max-h-[36%] min-h-[36%] h-[36%] gap-2 px-2">
            {(
              <>
                <Card className="w-full max-w-[350px] mb-4 p-4 bg-[#19181A] rounded-lg text-[rgb(255 255 255)]">
                  <h3 className="text-lg font-bold">Student Information</h3>
                  <p><strong>Name:</strong> {studentData.name}</p>
                  <p><strong>Age:</strong> {studentData.age}</p>
                  <p><strong>Course:</strong> {studentData.course}</p>
                </Card>
                <Card className="w-full mb-4 p-4 bg-[#19181A] rounded-lg text-[rgb(255 255 255)]">
                  <h3 className="text-lg font-bold mb-2">Fun Facts</h3>
                  <CardBody className="overflow-y-scroll">
                    {isLoadingFacts ? (
                      <Spinner color="default" size="sm" />
                    ) : factsError ? (
                      <p className="text-red-400">{factsError}</p>
                    ) : funFacts.length === 0 ? (
                      <p>Loading fun facts for you...</p>
                    ) : (
                      <ul className="flex flex-col gap-2 w-full list-none">
                        {funFacts.map((fact, index) => (
                          <div key={index} className="text-sm ">
                            <Chip
                              variant="flat"
                              className="bg-gradient-to-tr from-[#] to-indigo-300 text-white h-auto w-full rounded-md"
                              classNames={{
                                content: "whitespace-normal break-words text-left text-sm leading-normal py-2",
                              }}
                            >
                              {fact}
                            </Chip>
                          </div>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              </>
            )}
          </div>





        </Card>

        {/* 3  Slide-out panel – same flex sibling, but width animates */}
        <div
          className={`transition-all duration-300 overflow-hidden
                ${isLogsOpen ? "w-[25%] max-w-[350px]" : "w-0"}`}
        >
          <Card className="h-full">
            <CardBody className="overflow-y-scroll">
              <h3 className="text-lg font-bold mb-2">Logs</h3>
              {logs.length === 0 ? (
                <p>No logs available</p>
              ) : (
                <ul className="flex flex-col gap-1 text-white">
                  {logs.map((l, i) => (
                    <li key={i} className="text-sm">{l}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>



      </div>
      {/* <button
        onClick={() => setIsLogsOpen(!isLogsOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10
               bg-indigo-500 hover:bg-indigo-600 text-white
               rounded-l-lg px-2 py-1 focus:outline-none"
      >
        <span className="rotate-[270deg]">{isLogsOpen ? "Hide Logs" : "Show Logs"}</span>
      </button> */}
    </>
  );
}

export default InteractiveAvatar