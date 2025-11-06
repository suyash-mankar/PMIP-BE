const { extractResumeText } = require("../../../services/resumeParser");
const fs = require("fs").promises;

/**
 * Ingest Resume Node
 * Extracts text from the uploaded resume file
 */
async function ingestResumeNode(state) {
  console.log("[IngestResume] Starting...");
  
  try {
    if (!state.resumeFilePath) {
      throw new Error("Resume file path not provided");
    }

    // Extract text from resume
    const resumeText = await extractResumeText(state.resumeFilePath);
    
    if (!resumeText || resumeText.trim().length === 0) {
      throw new Error("Failed to extract text from resume");
    }

    console.log(`[IngestResume] Extracted ${resumeText.length} characters`);

    // Clean up the file after extraction
    try {
      await fs.unlink(state.resumeFilePath);
      console.log("[IngestResume] Temp file deleted");
    } catch (unlinkError) {
      console.warn("[IngestResume] Failed to delete temp file:", unlinkError.message);
    }

    return {
      ...state,
      resumeText,
      resumeFilePath: null, // Clear path after processing
    };
  } catch (error) {
    console.error("[IngestResume] Error:", error);
    state.metadata.errors.push({
      node: "ingestResume",
      error: error.message,
    });
    
    // Still try to clean up file
    if (state.resumeFilePath) {
      try {
        await fs.unlink(state.resumeFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    throw error;
  }
}

module.exports = { ingestResumeNode };

