const { prisma } = require("../config/database");
const { runJobMatchGraph } = require("../agents/jobMatcher/graph");
const fs = require("fs").promises;
const path = require("path");

/**
 * Helper: Save resume file to user-specific directory and return file data
 */
async function saveResumeForUser(userId, resumeFile) {
  const userResumeDir = path.join(process.cwd(), "uploads", "job-matcher", `user-${userId}`);
  await fs.mkdir(userResumeDir, { recursive: true });
  
  const fileExt = path.extname(resumeFile.originalname);
  const fileName = `resume-${Date.now()}${fileExt}`;
  const destinationPath = path.join(userResumeDir, fileName);
  
  // Copy file from temp location to user directory
  await fs.copyFile(resumeFile.path, destinationPath);
  
  // Read file content as buffer for database storage
  const fileData = await fs.readFile(resumeFile.path);
  
  return {
    path: destinationPath,
    data: fileData,
    fileName: resumeFile.originalname,
    fileType: resumeFile.mimetype || (fileExt === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  };
}

/**
 * Submit a job matching request
 */
async function submitJobMatch(req, res) {
  try {
    const { jobIntentText, desiredRole, companyPrefs, locationPref, remotePref, enableLinkedInSearch } = req.body;
    const resumeFile = req.file;
    const userId = req.user?.id; // Get user ID (required since auth is mandatory)
    
    // Use authenticated user's email (required since auth is mandatory)
    if (!userId || !req.user?.email) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const finalUserEmail = req.user.email;
    
    if (!jobIntentText) {
      return res.status(400).json({ error: "Job intent text is required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalUserEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user has a saved resume
    let existingPreferences = null;
    if (userId) {
      existingPreferences = await prisma.jobMatcherPreferences.findUnique({
        where: { userId },
        select: { resumeFilePath: true, resumeFileName: true },
      });
    }

    // Validation: Resume is required if no saved resume exists
    if (!resumeFile && !existingPreferences?.resumeFilePath) {
      return res.status(400).json({ error: "Resume file is required. Please upload your resume." });
    }

    // Save resume file to user directory and database if a new file is uploaded
    let savedResumePath = existingPreferences?.resumeFilePath || null;
    let resumeFileData = null;
    let resumeFileName = existingPreferences?.resumeFileName || null;
    let resumeFileType = null;
    
    if (resumeFile && userId) {
      try {
        const savedResume = await saveResumeForUser(userId, resumeFile);
        savedResumePath = savedResume.path;
        resumeFileData = savedResume.data;
        resumeFileName = savedResume.fileName;
        resumeFileType = savedResume.fileType;
        // Clean up temp file
        await fs.unlink(resumeFile.path).catch(() => {});
      } catch (saveError) {
        console.error("[JobMatcherController] Resume save error:", saveError);
        // If save fails but we have existing resume, use that
        if (!savedResumePath && existingPreferences?.resumeFilePath) {
          savedResumePath = existingPreferences.resumeFilePath;
          resumeFileName = existingPreferences.resumeFileName;
        }
      }
    }
    
    // Ensure we have a resume path
    if (!savedResumePath) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    // Save/update user preferences if logged in
    if (userId) {
      // Parse enableLinkedInSearch from request (can be string "true"/"false" from FormData)
      const enableLinkedIn = enableLinkedInSearch === true || enableLinkedInSearch === 'true';

      const updateData = {
        userEmail: finalUserEmail,
        jobIntentText,
        desiredRole: desiredRole || null,
        companyPrefs: companyPrefs || null,
        locationPref: locationPref || null,
        remotePref: remotePref || null,
        enableLinkedInSearch: enableLinkedIn,
      };

      // Only update resume fields if a new file was uploaded
      if (resumeFile && resumeFileData) {
        updateData.resumeFilePath = savedResumePath;
        updateData.resumeFileData = Buffer.from(resumeFileData);
        updateData.resumeFileName = resumeFileName;
        updateData.resumeFileType = resumeFileType;
      } else if (resumeFile) {
        // If upload failed but we have path, update it
        updateData.resumeFilePath = savedResumePath;
        if (resumeFileName) updateData.resumeFileName = resumeFileName;
      }

      await prisma.jobMatcherPreferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          resumeFilePath: savedResumePath,
          resumeFileData: resumeFileData ? Buffer.from(resumeFileData) : null,
          resumeFileName: resumeFileName || null,
          resumeFileType: resumeFileType || null,
          userEmail: finalUserEmail,
          jobIntentText,
          desiredRole: desiredRole || null,
          companyPrefs: companyPrefs || null,
          locationPref: locationPref || null,
          remotePref: remotePref || null,
          enableLinkedInSearch: enableLinkedIn,
        },
      });
    }

    // Create a run record
    const run = await prisma.jobMatchRun.create({
      data: {
        userId: userId || null,
        userEmail: finalUserEmail,
        jobIntentText,
        desiredRole: desiredRole || null,
        companyPrefs: companyPrefs || null,
        locationPref: locationPref || null,
        remotePref: remotePref || null,
        status: "queued",
      },
    });

    // Return immediately with runId
    res.json({ runId: run.id });

    // Start the graph execution in the background (don't await)
    runJobMatchGraph({
      runId: run.id,
      userId: userId || null, // Pass userId so graph can check user preferences
      resumeFilePath: savedResumePath,
      userEmail: finalUserEmail,
      jobIntentText,
      desiredRole,
      companyPrefs,
      locationPref,
      remotePref,
    }).catch((error) => {
      console.error("Job match graph error:", error);
    });
  } catch (error) {
    console.error("[JobMatcherController] Submit error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("[JobMatcherController] File cleanup error:", unlinkError);
      }
    }
    
    res.status(500).json({ error: "Failed to submit job matching request" });
  }
}

/**
 * Get the status of a job matching run
 */
async function getJobMatchStatus(req, res) {
  try {
    const { runId } = req.params;

    const run = await prisma.jobMatchRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        status: true,
        jobsFound: true,
        emailSentAt: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    const response = {
      runId: run.id,
      status: run.status,
      summary: null,
      counts: run.jobsFound,
    };

    if (run.status === "emailed") {
      response.summary = `Successfully found ${run.jobsFound} jobs and sent email`;
    } else if (run.status === "error") {
      response.summary = run.error || "An error occurred";
    } else if (run.status === "running") {
      response.summary = "Analyzing your resume and searching for jobs...";
    } else {
      response.summary = "Your request is queued for processing";
    }

    res.json(response);
  } catch (error) {
    console.error("[JobMatcherController] Get status error:", {
      error: error.message,
      runId: req.params.runId,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Failed to get job match status" });
  }
}

/**
 * Upload LinkedIn cookie (admin only)
 */
async function uploadLinkedInCookie(req, res) {
  try {
    const { li_at } = req.body;

    if (!li_at) {
      return res.status(400).json({ error: "li_at cookie is required" });
    }

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Store encrypted (basic encryption for now - in production use proper encryption)
    const crypto = require("crypto");
    const algorithm = "aes-256-cbc";
    const key = Buffer.from(process.env.ENCRYPTION_KEY || "0".repeat(64), "hex");
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(li_at, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const encryptedValue = iv.toString("hex") + ":" + encrypted;

    // Upsert the secret
    await prisma.secret.upsert({
      where: { key: "linkedin_li_at" },
      update: { value: encryptedValue },
      create: {
        key: "linkedin_li_at",
        value: encryptedValue,
        description: "LinkedIn li_at cookie for job scraping",
      },
    });

    res.json({ message: "LinkedIn cookie stored successfully" });
  } catch (error) {
    console.error("[JobMatcherController] Upload cookie error:", {
      error: error.message,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Failed to store LinkedIn cookie" });
  }
}

/**
 * Get user's saved job matcher preferences
 */
async function getPreferences(req, res) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const preferences = await prisma.jobMatcherPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      return res.json({
        hasPreferences: false,
        preferences: null,
      });
    }

    // Return file info (from database or file system)
    let resumeFileInfo = null;
    if (preferences.resumeFileName) {
      // Prefer database-stored file info
      resumeFileInfo = {
        fileName: preferences.resumeFileName,
        fileType: preferences.resumeFileType,
        fileSize: preferences.resumeFileData ? preferences.resumeFileData.length : null,
        hasFileData: !!preferences.resumeFileData,
        lastModified: preferences.updatedAt,
      };
    } else if (preferences.resumeFilePath) {
      // Fallback to file system
      try {
        const stats = await fs.stat(preferences.resumeFilePath);
        const fileName = path.basename(preferences.resumeFilePath);
        resumeFileInfo = {
          fileName,
          fileSize: stats.size,
          lastModified: stats.mtime,
          hasFileData: false,
        };
      } catch (statError) {
        // File doesn't exist, skip
        console.warn("[JobMatcherController] Resume file not found:", preferences.resumeFilePath);
      }
    }

    res.json({
      hasPreferences: true,
      preferences: {
        userEmail: preferences.userEmail,
        jobIntentText: preferences.jobIntentText,
        desiredRole: preferences.desiredRole,
        companyPrefs: preferences.companyPrefs,
        locationPref: preferences.locationPref,
        remotePref: preferences.remotePref,
        enableLinkedInSearch: preferences.enableLinkedInSearch || false,
        resumeFile: resumeFileInfo,
      },
    });
  } catch (error) {
    console.error("[JobMatcherController] Get preferences error:", {
      error: error.message,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Failed to get preferences" });
  }
}

/**
 * Save user's job matcher preferences (without submitting)
 */
async function savePreferences(req, res) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use authenticated user's email
    const userEmail = req.user.email;
    
    const { jobIntentText, desiredRole, companyPrefs, locationPref, remotePref, enableLinkedInSearch } = req.body;
    const resumeFile = req.file;

    let savedResumePath = null;
    let resumeFileData = null;
    let resumeFileName = null;
    let resumeFileType = null;
    
    if (resumeFile) {
      try {
        const savedResume = await saveResumeForUser(userId, resumeFile);
        savedResumePath = savedResume.path;
        resumeFileData = savedResume.data;
        resumeFileName = savedResume.fileName;
        resumeFileType = savedResume.fileType;
        // Clean up temp file
        await fs.unlink(resumeFile.path).catch(() => {});
      } catch (saveError) {
        console.error("[JobMatcherController] Resume save error:", saveError);
        return res.status(500).json({ error: "Failed to save resume file" });
      }
    }

    // Get existing preferences to preserve resume path if not updating
    const existing = await prisma.jobMatcherPreferences.findUnique({
      where: { userId },
    });

    const updateData = {
      userEmail: userEmail, // Always update to current user's email
    };
    if (jobIntentText !== undefined) updateData.jobIntentText = jobIntentText;
    if (desiredRole !== undefined) updateData.desiredRole = desiredRole || null;
    if (companyPrefs !== undefined) updateData.companyPrefs = companyPrefs || null;
    if (locationPref !== undefined) updateData.locationPref = locationPref || null;
    if (remotePref !== undefined) updateData.remotePref = remotePref || null;
    if (enableLinkedInSearch !== undefined) updateData.enableLinkedInSearch = enableLinkedInSearch === true || enableLinkedInSearch === 'true';
    if (savedResumePath) {
      updateData.resumeFilePath = savedResumePath;
      updateData.resumeFileData = resumeFileData ? Buffer.from(resumeFileData) : undefined;
      updateData.resumeFileName = resumeFileName || undefined;
      updateData.resumeFileType = resumeFileType || undefined;
    }

    const preferences = await prisma.jobMatcherPreferences.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        resumeFilePath: savedResumePath,
        resumeFileData: resumeFileData ? Buffer.from(resumeFileData) : null,
        resumeFileName: resumeFileName || null,
        resumeFileType: resumeFileType || null,
        userEmail: userEmail,
        jobIntentText: jobIntentText || existing?.jobIntentText || "",
        desiredRole: desiredRole || null,
        companyPrefs: companyPrefs || null,
        locationPref: locationPref || null,
        remotePref: remotePref || null,
        enableLinkedInSearch: enableLinkedInSearch === true || enableLinkedInSearch === 'true' || false,
      },
    });

    res.json({
      message: "Preferences saved successfully",
      preferences: {
        userEmail: preferences.userEmail,
        jobIntentText: preferences.jobIntentText,
        desiredRole: preferences.desiredRole,
        companyPrefs: preferences.companyPrefs,
        locationPref: preferences.locationPref,
        remotePref: preferences.remotePref,
        enableLinkedInSearch: preferences.enableLinkedInSearch || false,
        hasResume: !!preferences.resumeFilePath,
      },
    });
  } catch (error) {
    console.error("[JobMatcherController] Save preferences error:", {
      error: error.message,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Failed to save preferences" });
  }
}

/**
 * Download user's saved resume file
 */
async function downloadResume(req, res) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const preferences = await prisma.jobMatcherPreferences.findUnique({
      where: { userId },
      select: {
        resumeFileData: true,
        resumeFileName: true,
        resumeFileType: true,
        resumeFilePath: true,
      },
    });

    if (!preferences) {
      return res.status(404).json({ error: "No resume found" });
    }

    // Try to get file from database first
    if (preferences.resumeFileData) {
      const buffer = Buffer.from(preferences.resumeFileData);
      const fileName = preferences.resumeFileName || 'resume.pdf';
      const contentType = preferences.resumeFileType || 'application/pdf';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // Fallback to file system if database doesn't have it
    if (preferences.resumeFilePath) {
      try {
        const fileData = await fs.readFile(preferences.resumeFilePath);
        const fileName = path.basename(preferences.resumeFilePath);
        const contentType = preferences.resumeFileType || 'application/pdf';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', fileData.length);
        return res.send(fileData);
      } catch (fileError) {
        console.error("[JobMatcherController] File read error:", fileError);
        return res.status(404).json({ error: "Resume file not found" });
      }
    }

    return res.status(404).json({ error: "No resume file available" });
  } catch (error) {
    console.error("[JobMatcherController] Download resume error:", {
      error: error.message,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: "Failed to download resume" });
  }
}

module.exports = {
  submitJobMatch,
  getJobMatchStatus,
  uploadLinkedInCookie,
  getPreferences,
  savePreferences,
  downloadResume,
};

