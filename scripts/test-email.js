require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  console.log('SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NOT SET');
  console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME || 'NOT SET');
  console.log('');
  
  // Check if SMTP_USER looks correct (should end with @smtp-brevo.com)
  if (process.env.SMTP_USER && !process.env.SMTP_USER.includes('@smtp-brevo.com')) {
    console.warn('⚠️  WARNING: SMTP_USER should be your Brevo SMTP username (e.g., 9ae921001@smtp-brevo.com)');
    console.warn('   Current value:', process.env.SMTP_USER);
    console.warn('   This should be the "Login" shown in Brevo → Settings → SMTP & API\n');
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ ERROR: SMTP_USER and SMTP_PASS must be set in .env file');
    process.exit(1);
  }

  // Create transporter
  const config = {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  console.log('SMTP Configuration:');
  console.log(JSON.stringify({ ...config, auth: { user: config.auth.user, pass: '***' } }, null, 2));
  console.log('');

  try {
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport(config);

    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    const testEmailAddress = process.env.TEST_EMAIL || process.env.SMTP_USER;
    console.log(`Sending test email to: ${testEmailAddress}`);
    
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'PM Interview Practice - Job Matcher';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: testEmailAddress,
      subject: 'Test Email from Job Matcher',
      html: `
        <h2>✅ Test Email Successful!</h2>
        <p>This is a test email from the Job Matcher feature.</p>
        <p>If you received this, your SMTP configuration is working correctly.</p>
        <hr>
        <p><small>Sent at: ${new Date().toISOString()}</small></p>
      `,
      text: 'Test Email Successful! This is a test email from the Job Matcher feature.',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n🎉 Check your email inbox for the test message!');
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }

    if (error.code === 'EAUTH') {
      console.error('\n🔍 Authentication failed. Please check:');
      console.error('1. SMTP_USER is correct (should be your Brevo account email or SMTP key name)');
      console.error('2. SMTP_PASS is the generated SMTP key (not your account password)');
      console.error('3. Credentials are correctly set in .env file');
      console.error('4. Go to Brevo → Settings → SMTP & API to verify/regenerate SMTP key');
    }

    process.exit(1);
  }
}

testEmail().catch(console.error);

