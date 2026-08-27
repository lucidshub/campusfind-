const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "items.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const JWT_SECRET = process.env.JWT_SECRET || "campusfind-dev-secret-change-me";

// ---- Ensure data & upload dirs exist ----
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// ---- Persistence helpers ----
function readItems() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

// ---- Auth helpers ----
function signToken(user) {
  return jwt.sign({ uid: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

// 9-digit student PRN OR ACPCE faculty email
function roleFromUsername(username) {
  if (/^\d{9}$/.test(username)) return "student";
  if (/^[^\s@]+@acpce\.ac\.in$/i.test(username)) return "faculty";
  return null;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = readUsers().find((u) => u._id === payload.uid);
    if (!user) {
      return res.status(401).json({ error: "Invalid user" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ---- Auth API ----
app.post("/api/auth/register", async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: "Username, password and name are required" });
  }

  const role = roleFromUsername(username);
  if (!role) {
    return res.status(400).json({
      error: "Invalid username. Use a 9-digit PRN (student) or an @acpce.ac.in email (faculty).",
    });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    _id: crypto.randomBytes(12).toString("hex"),
    username,
    password: hashed,
    role,
    name,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = readUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// ---- Image upload (auth required) ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ---- Items API ----
app.get("/api/items", (req, res) => {
  let items = readItems().filter((item) => !item.claimed);
  const q = (req.query.q || "").toString().trim().toLowerCase();

  if (q) {
    items = items.filter((item) =>
      [item.itemName, item.description, item.location]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }

  // newest first
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(items);
});

app.get("/api/items/:id", (req, res) => {
  const item = readItems().find((i) => i._id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }
  res.json(item);
});

app.post("/api/items", requireAuth, (req, res) => {
  const { type, itemName, description, location, date, contact, imageUrl } = req.body;

  if (!["lost", "found"].includes(type)) {
    return res.status(400).json({ error: "type must be 'lost' or 'found'" });
  }
  if (!itemName || !description || !location || !date || !contact) {
    return res.status(400).json({ error: "All required fields must be filled" });
  }

  const items = readItems();
  const newItem = {
    _id: crypto.randomBytes(12).toString("hex"),
    type,
    itemName,
    description,
    location,
    date,
    contact,
    imageUrl: imageUrl || "",
    reporterId: req.user._id,
    reporterName: req.user.name,
    reporterRole: req.user.role,
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);
  writeItems(items);
  res.status(201).json(newItem);
});

app.post("/api/items/:id/claim", requireAuth, (req, res) => {
  const items = readItems();
  const item = items.find((i) => i._id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  const isReporter = item.reporterId === req.user._id;
  const isFaculty = req.user.role === "faculty";

  if (!isReporter && !isFaculty) {
    return res.status(403).json({ error: "Only the reporter or faculty can claim this item" });
  }

  item.claimed = true;
  item.claimedBy = req.user._id;
  item.claimedAt = new Date().toISOString();
  writeItems(items);
  res.json(item);
});

// ---- Root ----
app.get("/", (req, res) => {
  res.send("CampusFind backend is working!");
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`CampusFind backend running on port ${PORT}`);
});
