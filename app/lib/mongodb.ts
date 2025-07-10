import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "ai_tutor";

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });
    await client.connect();
    console.log("Connected to MongoDB");
  }

  db = client.db(dbName);
  return db;
}

// Close MongoDB connection
async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

// Interface for Student Data
interface StudentData {
  username: string;
  password: string; // In production, passwords should be hashed
  knowledge_id: string;
  name: string;
  age: string;
  course: string;
  class_rank: string;
  gpa: string;
  new_knowledge_id: string;
}

// Authenticate user
async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; knowledgeId?: string; error?: string }> {
  try {
    const database = await connectToDatabase();
    const collection = database.collection<StudentData>("users");

    const user = await collection.findOne({ username, password }); // In production, compare hashed passwords
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    return { success: true, knowledgeId: user.knowledge_id };
  } catch (error) {
    console.error("Error authenticating user:", error);
    return { success: false, error: "Database error during authentication" };
  }
}

// Fetch student data by username
async function fetchStudentData(
  username: string
): Promise<StudentData | null> {
  try {
    const database = await connectToDatabase();
    const collection = database.collection<StudentData>("users");

    const user = await collection.findOne({ username });
    if (!user) {
      return null;
    }

    return {
      username: user.username,
      password: user.password,
      knowledge_id: user.knowledge_id,
      name: user.name,
      age: user.age,
      course: user.course,
      class_rank: user.class_rank,
      gpa: user.gpa,
      new_knowledge_id: user.new_knowledge_id,
    };
  } catch (error) {
    console.error("Error fetching student data:", error);
    return null;
  }
}

export { connectToDatabase, closeConnection, authenticateUser, fetchStudentData };