const screens = {
            home: document.getElementById('homeScreen'),
            loading: document.getElementById('loadingScreen'),
            confirmation: document.getElementById('confirmationScreen')
        };
        const imageUpload = document.getElementById('imageUpload');
        const imagePreview = document.getElementById('imagePreview');
        const eventForm = document.getElementById('eventForm');
        const startOverBtn = document.getElementById('startOverBtn');
        const homeError = document.getElementById('homeError');
        const formError = document.getElementById('formError');

        function switchScreen(screenName) {
            Object.values(screens).forEach(screen => screen.classList.remove('active'));
            if (screens[screenName]) {
                screens[screenName].classList.add('active');
            }
        }

        export function openCamera(inputId = 'imageUpload') {
            const input = document.getElementById(inputId);
            input.setAttribute('capture', 'environment');
            input.click();
        }

        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                homeError.textContent = '';
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    extractEventDetails(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
        
        startOverBtn.addEventListener('click', () => {
             imageUpload.value = '';
             imagePreview.src = 'https://placehold.co/400x250/E2E8F0/4A5568?text=Your+Event+Flyer+Here';
             switchScreen('home');
        });

        async function extractEventDetails(base64ImageData) {
            // IMPORTANT: PASTE YOUR GOOGLE AI API KEY HERE
            // Get a free key from Google AI Studio: https://aistudio.google.com/app/apikey
            const apiKey = "AIzaSyCZldMbx_OgEJx5dVZotQFha49AGJ6gJP4";

            if (apiKey === "PASTE_YOUR_API_KEY_HERE" || apiKey === "") {
                homeError.textContent = "API Key is missing. Please add your Google AI API key in the script.";
                switchScreen('home');
                return;
            }

            switchScreen('loading');
            const base64Data = base64ImageData.split(',')[1];

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    parts: [
                        { text: "Analyze the image of this event flyer and extract the event details. Provide the output in a clean JSON object. The date should be in YYYY-MM-DD format. The time should be in 24-hour HH:MM format. If you cannot find a piece of information, return an empty string for that field." }, 
                        { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "title": { "type": "STRING" },
                            "date": { "type": "STRING", "description": "YYYY-MM-DD" },
                            "time": { "type": "STRING", "description": "HH:MM (24-hour)" },
                            "location": { "type": "STRING" }
                        },
                         "required": ["title", "date", "time", "location"]
                    }
                }
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    // Try to parse error from Google API for more specific feedback
                    const errorData = await response.json();
                    const errorMessage = errorData?.error?.message || response.statusText;
                    throw new Error(`API error: ${errorMessage}`);
                }

                const result = await response.json();
                
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts.length > 0) {
                    const jsonText = result.candidates[0].content.parts[0].text;
                    const data = JSON.parse(jsonText);
                    
                    document.getElementById('eventTitle').value = data.title || '';
                    document.getElementById('eventDate').value = data.date || '';
                    document.getElementById('eventTime').value = data.time || '';
                    document.getElementById('eventLocation').value = data.location || '';
                    
                    switchScreen('confirmation');
                } else {
                    throw new Error("Could not parse event details from the AI's response.");
                }

            } catch (error) {
                console.error('Error:', error);
                switchScreen('home');
                homeError.textContent = `Error scanning image: ${error.message}`;
            }
        }

        eventForm.addEventListener('submit', (event) => {
            event.preventDefault();
            formError.textContent = '';

            const title = document.getElementById('eventTitle').value;
            const location = document.getElementById('eventLocation').value;
            const date = document.getElementById('eventDate').value;
            const time = document.getElementById('eventTime').value;

            if (!title || !date || !time) {
                formError.textContent = "Title, date, and time are required.";
                return;
            }

            // Combine date and time and format for Google Calendar (YYYYMMDDTHHMMSS)
            // Assuming event duration of 1 hour for simplicity
            const startDateTime = new Date(`${date}T${time}`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            // Format to YYYYMMDDTHHMMSSZ, removing symbols
            const formatDateForGoogle = (dt) => dt.toISOString().replace(/[-:.]/g, '').slice(0, -4) + 'Z';

            const googleStartDate = formatDateForGoogle(startDateTime);
            const googleEndDate = formatDateForGoogle(endDateTime);

            const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${googleStartDate}/${googleEndDate}&location=${encodeURIComponent(location)}&details=Event created with AI Event Scanner.`;
            
            window.open(calendarUrl, '_blank');
        });
        
        export function scheduleReminder(eventDetails) {
          if (!("Notification" in window)) return;
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              const eventTime = new Date(`${eventDetails.date}T${eventDetails.time}`);
              const now = new Date();
              const delay = eventTime - now;
              if (delay > 0) {
                setTimeout(() => {
                  new Notification(`Reminder: ${eventDetails.title}`, {
                    body: `Event at ${eventDetails.time} on ${eventDetails.date}`,
                  });
                }, delay);
              }
            }
          });
        }
        export function scheduleAlarm(eventDetails) {
          const eventTime = new Date(`${eventDetails.date}T${eventDetails.time}`);
          const now = new Date();
          const delay = eventTime - now;
          if (delay > 0) {
            setTimeout(() => {
              const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
              audio.play();
              alert(`Alarm: ${eventDetails.title} is starting now!`);
            }, delay);
          }
        }