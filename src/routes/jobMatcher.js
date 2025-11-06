const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const rateLimit = require("express-rate-limit");
const {
  submitJobMatch,
  getJobMatchStatus,
  uploadLinkedInCookie,
  getPreferences,
  savePreferences,
  downloadResume,
} = require("../controllers/jobMatcherController");
const { optionalAuthMiddleware } = require("../middlewares/optionalAuth");
const { authMiddleware } = require("../middlewares/auth");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = "/tmp/job-matcher-uploads";
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Rate limiter for job matcher submissions
const submitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 submissions per 15 minutes per IP
  message: "Too many job match requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/job-matcher/preferences
// Get user's saved preferences (requires auth)
router.get("/preferences", authMiddleware, getPreferences);

// POST /api/job-matcher/preferences
// Save user's preferences (requires auth)
router.post("/preferences", authMiddleware, upload.single("resumeFile"), savePreferences);

// POST /api/job-matcher/submit
// Submit a job matching request (requires auth since page is protected)
router.post("/submit", authMiddleware, submitRateLimiter, upload.single("resumeFile"), submitJobMatch);

// GET /api/job-matcher/status/:runId
// Get the status of a job matching run
router.get("/status/:runId", getJobMatchStatus);

// GET /api/job-matcher/resume
// Download user's saved resume file (requires auth)
router.get("/resume", authMiddleware, downloadResume);

// POST /api/admin/linkedin-cookie
// Admin endpoint to upload LinkedIn cookie (requires authentication)
router.post("/admin/linkedin-cookie", authMiddleware, uploadLinkedInCookie);

module.exports = router;

