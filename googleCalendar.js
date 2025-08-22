const { google } = require('googleapis');
const path = require('path');

class GoogleCalendarService {
    constructor() {
        this.auth = null;
        this.calendar = null;
        this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // For service account authentication
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                this.auth = new google.auth.GoogleAuth({
                    credentials: serviceAccountKey,
                    scopes: ['https://www.googleapis.com/auth/calendar']
                });
            } else {
                // For OAuth2 authentication (alternative method)
                this.auth = new google.auth.GoogleAuth({
                    keyFile: path.join(__dirname, 'credentials.json'),
                    scopes: ['https://www.googleapis.com/auth/calendar']
                });
            }

            this.calendar = google.calendar({ version: 'v3', auth: this.auth });
            console.log('✅ Google Calendar service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Calendar service:', error.message);
            this.auth = null;
            this.calendar = null;
        }
    }

    async addBookingToCalendar(booking) {
        if (!this.calendar) {
            console.log('⚠️ Google Calendar service not available, skipping calendar integration');
            return { success: false, error: 'Calendar service not available' };
        }

        try {
            const startTime = new Date(`${booking.date}T${booking.time}:00`);
            const endTime = new Date(startTime.getTime() + (40 * 60 * 1000)); // 40 minutes duration

            const event = {
                summary: `King Taper - ${booking.service}`,
                description: `Client: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nService: ${booking.service}\nPrice: KSH ${booking.price}\nNotes: ${booking.message || 'None'}`,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Africa/Nairobi'
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Africa/Nairobi'
                },
                location: 'King Taper, Mombasa, Kenya',
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 30 },
                        { method: 'popup', minutes: 15 }
                    ]
                },
                colorId: this.getColorIdForService(booking.service)
            };

            const response = await this.calendar.events.insert({
                calendarId: this.calendarId,
                resource: event
            });

            console.log('✅ Booking added to Google Calendar:', response.data.id);
            return { 
                success: true, 
                eventId: response.data.id,
                eventUrl: response.data.htmlLink
            };

        } catch (error) {
            console.error('❌ Failed to add booking to Google Calendar:', error.message);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    getColorIdForService(service) {
        // Map services to Google Calendar colors
        const colorMap = {
            'Hair Cut': '1',        // Lavender
            'Kids Cut': '2',        // Sage
            'Coils & Haircut': '3', // Grape
            'Barrel Twist': '4',    // Flamingo
            'Twist': '5',           // Banana
            'Hair Color': '6'       // Peacock
        };
        return colorMap[service] || '1'; // Default to lavender
    }

    async deleteEventFromCalendar(eventId) {
        if (!this.calendar) {
            return { success: false, error: 'Calendar service not available' };
        }

        try {
            await this.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId
            });
            console.log('✅ Event deleted from Google Calendar:', eventId);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to delete event from Google Calendar:', error.message);
            return { success: false, error: error.message };
        }
    }

    async updateEventInCalendar(eventId, booking) {
        if (!this.calendar) {
            return { success: false, error: 'Calendar service not available' };
        }

        try {
            const startTime = new Date(`${booking.date}T${booking.time}:00`);
            const endTime = new Date(startTime.getTime() + (40 * 60 * 1000));

            const event = {
                summary: `King Taper - ${booking.service}`,
                description: `Client: ${booking.name}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nService: ${booking.service}\nPrice: KSH ${booking.price}\nNotes: ${booking.message || 'None'}`,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Africa/Nairobi'
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Africa/Nairobi'
                },
                location: 'King Taper, Mombasa, Kenya',
                colorId: this.getColorIdForService(booking.service)
            };

            const response = await this.calendar.events.update({
                calendarId: this.calendarId,
                eventId: eventId,
                resource: event
            });

            console.log('✅ Event updated in Google Calendar:', eventId);
            return { success: true, eventId: response.data.id };

        } catch (error) {
            console.error('❌ Failed to update event in Google Calendar:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = GoogleCalendarService;
