# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for your King Taper booking system.

## 🎯 What This Does

- **Automatic Calendar Events**: Every booking automatically creates a Google Calendar event
- **Event Details**: Includes client name, service, price, phone, email, and notes
- **Smart Reminders**: 30-minute and 15-minute popup reminders before appointments
- **Color Coding**: Different services get different colors in your calendar
- **Sync Management**: Updates and deletes calendar events when bookings change

## 📋 Prerequisites

1. **Google Account** with access to Google Calendar
2. **Google Cloud Project** (free tier available)
3. **Node.js** and **npm** installed

## 🚀 Setup Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**

### Step 2: Create Service Account

1. In Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Give it a name (e.g., "king-taper-calendar")
4. Add description: "Service account for King Taper booking calendar integration"
5. Click **Create and Continue**
6. Skip role assignment, click **Continue**
7. Click **Done**

### Step 3: Generate Service Account Key

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download the JSON file
6. **Keep this file secure** - it contains sensitive credentials

### Step 4: Share Calendar with Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find your calendar in the left sidebar
3. Click the three dots next to your calendar name
4. Select **Settings and sharing**
5. Scroll down to **Share with specific people**
6. Click **+ Add people**
7. Add your service account email (found in the JSON file under `client_email`)
8. Give it **Make changes to events** permission
9. Click **Send**

### Step 5: Configure Environment Variables

1. Copy your `.env` file or create one from `env.example`
2. Add your Google Calendar configuration:

```bash
# Google Calendar Configuration
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your_project_id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Optional: Specific calendar ID (defaults to 'primary')
GOOGLE_CALENDAR_ID=your_email@gmail.com
```

3. Copy the entire JSON content from your downloaded service account key file into `GOOGLE_SERVICE_ACCOUNT_KEY`

### Step 6: Test the Integration

1. Restart your server: `npm start`
2. Make a test booking through your booking form
3. Check your Google Calendar for the new event
4. Verify the event details are correct

## 🔧 Troubleshooting

### Common Issues

1. **"Calendar service not available"**
   - Check your service account key is correct
   - Verify the calendar is shared with the service account
   - Ensure Google Calendar API is enabled

2. **"Permission denied"**
   - Make sure the service account has "Make changes to events" permission
   - Check the calendar ID is correct

3. **Events not appearing**
   - Check server logs for error messages
   - Verify your timezone settings (defaults to Africa/Nairobi)

### Debug Mode

The server logs will show:
- ✅ Successful calendar operations
- ⚠️ Warnings when calendar operations fail
- ❌ Errors with detailed messages

## 📱 Calendar Event Features

### Event Details
- **Title**: "King Taper - [Service Name]"
- **Description**: Client details, service, price, notes
- **Location**: "King Taper, Mombasa, Kenya"
- **Duration**: 40 minutes (matches your booking slots)
- **Reminders**: 30 min and 15 min before

### Color Coding
- **Hair Cut**: Lavender
- **Kids Cut**: Sage  
- **Coils & Haircut**: Grape
- **Barrel Twist**: Flamingo
- **Twist**: Banana
- **Hair Color**: Peacock

## 🔒 Security Notes

- **Never commit** your service account key to version control
- **Rotate keys** regularly for production use
- **Limit permissions** to only what's needed (calendar access)
- **Monitor usage** in Google Cloud Console

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your Google Cloud setup
3. Test with a simple calendar event first
4. Ensure your calendar permissions are correct

## 🎉 Success!

Once configured, every booking will automatically:
- ✅ Create a Google Calendar event
- ✅ Include all client and service details
- ✅ Set appropriate reminders
- ✅ Use color coding for different services
- ✅ Sync with your existing calendar workflow

Your King Taper business will now have seamless calendar integration! 📅✨
