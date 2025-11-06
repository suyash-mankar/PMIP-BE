const nodemailer = require("nodemailer");

/**
 * Create email transporter (Brevo/Sendinblue SMTP)
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 30000, // 30 seconds to establish connection (increased for Railway)
    socketTimeout: 60000, // 60 seconds for socket operations
    greetingTimeout: 15000, // 15 seconds for SMTP greeting
    pool: true, // Use connection pooling
    maxConnections: 1,
    maxMessages: 1,
  };

  return nodemailer.createTransport(config);
}

/**
 * Send job matching results email with timeout
 */
async function sendJobMatchEmail({ to, jobs, userIntent, runId }) {
  let transporter = null;
  
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not configured, skipping email");
      return { success: false, message: "SMTP not configured" };
    }

    transporter = createTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || "PM Interview Practice - Job Matcher";

    // Generate HTML email
    const html = generateJobMatchEmailHTML({ jobs, userIntent, runId });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: `Top ${jobs.length} Job Matches for ${userIntent || "Your Search"}`,
      html: html,
      text: generateJobMatchEmailText({ jobs, userIntent }), // Fallback plain text
    };

    // Send email with timeout (60 seconds total)
    const emailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Email send timeout after 60 seconds")), 60000);
    });

    const info = await Promise.race([emailPromise, timeoutPromise]);
    console.log("Email sent:", info.messageId);
    
    // Close transporter connection (ignore errors if already closed)
    try {
      if (transporter) {
        transporter.close();
      }
    } catch (closeError) {
      // Ignore close errors
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    
    // Ensure transporter is closed even on error
    try {
      if (transporter && transporter.close) {
        transporter.close();
      }
    } catch (closeError) {
      // Ignore close errors
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Generate HTML email template
 */
function generateJobMatchEmailHTML({ jobs, userIntent, runId }) {
  const jobCards = jobs
    .map(
      (job, index) => {
        const scorePercent = (parseFloat(job.score) * 100).toFixed(0);
        
        return `
    <!-- Job Card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          
          <!-- Job Header -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="width: 28px; vertical-align: top;">
                            <div style="background: #6366f1; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; text-align: center; font-size: 14px; font-weight: 700; line-height: 28px;">${index + 1}</div>
                          </td>
                          <td style="padding-left: 12px; vertical-align: top; width: 100%;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="vertical-align: top;">
                                  <h3 style="margin: 0; color: #111827; font-size: 18px; font-weight: 700; line-height: 1.3;">${job.jobTitle}</h3>
                                </td>
                                <td style="vertical-align: top; text-align: right; padding-left: 12px;">
                                  <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; white-space: nowrap;">${scorePercent}% match</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <p style="margin: 0; color: #374151; font-size: 15px; font-weight: 600;">${job.company}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="color: #6b7280; font-size: 13px; padding-right: 16px; vertical-align: top;">📍 ${job.location || "Location not specified"}</td>
                          ${job.postedDate ? `<td style="color: #6b7280; font-size: 13px; vertical-align: top;">📅 ${formatDate(job.postedDate)}</td>` : ''}
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${job.salary ? `
                  <tr>
                    <td>
                      <span style="display: inline-block; background: #ecfdf5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">💰 ${job.salary}</span>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </td>
            </tr>
          </table>
          
          ${job.rationale ? `
          <!-- Why This Fits Section -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 16px 20px; background: #fffbeb; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 700;">Why this role is perfect for you:</p>
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                  ${job.rationale.split('\n').filter(line => line.trim()).map(line => line.trim().replace(/^•\s*/, '')).join('<br/>')}
                </p>
              </td>
            </tr>
          </table>
          ` : ''}
          
          <!-- Apply Button -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 16px 20px; text-align: center; background: #ffffff;">
                <a href="${job.applyUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Apply Now →
                </a>
              </td>
            </tr>
          </table>
          
        </td>
      </tr>
    </table>
  `;
      }
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Top Job Matches</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding: 20px 16px !important;
      }
      .mobile-text-center {
        text-align: center !important;
      }
      .mobile-full-width {
        width: 100% !important;
        display: block !important;
      }
      .mobile-hide {
        display: none !important;
      }
      h1 {
        font-size: 24px !important;
      }
      h3 {
        font-size: 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Email Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: #6366f1; padding: 32px 20px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                Your Top Job Matches
              </h1>
              <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                Curated by PM Interview Practice AI
              </p>
            </td>
          </tr>
          
          <!-- Search Criteria -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 32px; background: #ffffff; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px;">
                    <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Search</p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600; line-height: 1.4;">
                      ${userIntent || "General job search in India"}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Introduction -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 32px; background: #ffffff;">
              <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                We've analyzed your resume and searched across multiple job platforms in India to find the perfect opportunities for you.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Here are the <strong style="color: #6366f1; font-weight: 600;">top ${jobs.length} job matches</strong> that align with your skills and experience:
              </p>
            </td>
          </tr>
          
          <!-- Job Listings -->
          <tr>
            <td class="mobile-padding" style="padding: 0 32px 24px 32px; background: #ffffff;">
              ${jobCards}
            </td>
          </tr>
          
          <!-- Next Steps -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 32px; background: #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                      <strong>Next Steps:</strong> Review each opportunity and click "Apply Now" to be taken directly to the application page. Good luck with your job search!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="mobile-text-center" style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px;">
                      Request ID: <span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; color: #374151;">${runId}</span>
                    </p>
                    <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                      This email was generated by <strong style="color: #6366f1;">PM Interview Practice's AI Job Matcher</strong>.<br/>
                      <a href="https://pminterviewpractice.com" style="color: #6366f1; text-decoration: none;">Visit our platform</a> for more career resources.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 11px; line-height: 1.5;">
                      © ${new Date().getFullYear()} PM Interview Practice. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'today';
    if (diffDays === 2) return 'yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return new Date(dateString).toLocaleDateString();
  }
}

/**
 * Generate plain text email (fallback)
 */
function generateJobMatchEmailText({ jobs, userIntent }) {
  let text = `Your Top Job Matches\n\n`;
  text += `Search: ${userIntent || "General job search in India"}\n\n`;
  text += `We found ${jobs.length} opportunities matching your profile:\n\n`;

  jobs.forEach((job, index) => {
    text += `${index + 1}. ${job.jobTitle}\n`;
    text += `   Company: ${job.company}\n`;
    text += `   Location: ${job.location || "Not specified"}\n`;
    if (job.salary) text += `   Salary: ${job.salary}\n`;
    if (job.rationale) text += `   Why this fits: ${job.rationale}\n`;
    text += `   Apply: ${job.applyUrl}\n\n`;
  });

  text += `\nBest of luck with your job search!\n`;
  text += `- PM Interview Practice Team\n`;

  return text;
}

module.exports = {
  sendJobMatchEmail,
  createTransporter,
};

