const fs = require("fs").promises;
const path = require("path");

/**
 * Extract text from PDF file
 * Note: Requires pdf-parse package
 */
async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = require("pdf-parse");
    const dataBuffer = await fs.readFile(filePath);
    
    // In pdf-parse v2.4+, PDFParse is a class that needs to be instantiated
    const PDFParse = pdfParse.PDFParse;
    
    if (!PDFParse || typeof PDFParse !== 'function') {
      throw new Error('PDFParse class not found in pdf-parse module');
    }
    
    // Create an instance with the PDF data
    const parser = new PDFParse({ data: dataBuffer });
    
    // Get text from the PDF
    const result = await parser.getText();
    
    // Return the text content
    return result.text || '';
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from DOCX file
 * Note: Requires mammoth package
 */
async function extractTextFromDOCX(filePath) {
  try {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

/**
 * Extract text from resume file based on extension
 */
async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return await extractTextFromPDF(filePath);
  } else if (ext === ".docx") {
    return await extractTextFromDOCX(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

module.exports = {
  extractResumeText,
  extractTextFromPDF,
  extractTextFromDOCX,
};

