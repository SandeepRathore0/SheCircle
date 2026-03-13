// Simple vanilla JS page navigation system
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });

    // Show target page
    const target = document.getElementById(pageId);
    if(target) {
        target.style.display = 'block';
        // Add a small delay for animation if we add one later
        setTimeout(() => target.classList.add('active'), 10);
    }

    // Trigger page-specific logic
    if (pageId === 'circles-page') {
        fetchCircles();
    } else if (pageId === 'meetups-page') {
        fetchMeetups();
    } else if (pageId === 'wall-page') {
        fetchPosts();
    } else if (pageId !== 'circle-detail-page') {
        // Disconnect chat if leaving detail page
        if (CIRCLE_CHAT_WS) {
            CIRCLE_CHAT_WS.close();
            CIRCLE_CHAT_WS = null;
        }
    }
}

// send AI Message
window.sendAIMessage = function() {
    const input = document.getElementById('ai-chat-input');
    const msg = input.value.trim();

    if (!msg) return;

    const history = document.getElementById('ai-chat-history');

    // USER MESSAGE
    const userBubble = document.createElement('div');
    userBubble.style.textAlign = 'right';
    userBubble.style.margin = '10px 0';

    userBubble.innerHTML = `
        <div style="display:inline-block;padding:10px 16px;background:var(--blush-pink);border-radius:14px 14px 0 14px;color:var(--text-dark);max-width:80%;">
            ${msg}
        </div>
    `;

    history.appendChild(userBubble);
    input.value = '';
    history.scrollTop = history.scrollHeight;

    // AI TYPING INDICATOR
    const typingBubble = document.createElement('div');
    typingBubble.style.textAlign = 'left';
    typingBubble.style.margin = '10px 0';

    typingBubble.innerHTML = `
        <div style="display:inline-block;padding:10px 16px;background:white;border-radius:14px 14px 14px 0;box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            SheCircle AI is typing...
        </div>
    `;

    history.appendChild(typingBubble);
    history.scrollTop = history.scrollHeight;

    // CALL FASTAPI BACKEND
    fetch(`${API_BASE_URL}/ai/support`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: msg
        })
    })
    .then(res => res.json())
    .then(data => {
        history.removeChild(typingBubble);

        const aiBubble = document.createElement('div');
        aiBubble.style.textAlign = 'left';
        aiBubble.style.margin = '10px 0';

        aiBubble.innerHTML = `
            <div style="display:inline-block;padding:10px 16px;background:white;border-radius:14px 14px 14px 0;color:var(--text-dark);box-shadow:0 2px 5px rgba(0,0,0,0.05);max-width:80%;">
                ${data.reply}
            </div>
        `;

        history.appendChild(aiBubble);
        history.scrollTop = history.scrollHeight;
    })
    .catch(err => {
        history.removeChild(typingBubble);
        const errorBubble = document.createElement('div');
        errorBubble.style.textAlign = 'left';
        errorBubble.style.margin = '10px 0';

        errorBubble.innerHTML = `
            <div style="display:inline-block;padding:10px 16px;background:#ffe5e5;border-radius:14px;color:#a33;">
                Sorry, something went wrong. Please try again.
            </div>
        `;

        history.appendChild(errorBubble);
        console.error("Chat error:", err);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // We could fetch initial data from our FastAPI backend here
    console.log("SheCircle Frontend Initialized");

    const input = document.getElementById("ai-chat-input");
    if (input) {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                window.sendAIMessage();
            }
        });
    }
});

// --- Circles & Auth Feature API ---
const API_BASE_URL = 'http://127.0.0.1:8000/api';
let CURRENT_USER = null;
let CIRCLE_CHAT_WS = null;
let G_MAP = null;
let USER_LOCATION = { lat: 0, lng: 0 };
let MAP_MARKERS = [];
let USER_MARKERS = [];

// Auth Functions
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
    
    // Reset inputs and to signin view
    document.getElementById('auth-signin-view').style.display = 'block';
    document.getElementById('auth-signup-view').style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
}

function toggleAuthMode(mode) {
    if (mode === 'signup') {
        document.getElementById('auth-signin-view').style.display = 'none';
        document.getElementById('auth-signup-view').style.display = 'block';
    } else {
        document.getElementById('auth-signin-view').style.display = 'block';
        document.getElementById('auth-signup-view').style.display = 'none';
    }
}

async function registerCustomUser(event) {
    event.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Registration failed');
        }

        const userData = await response.json();
        
        // Auto-login upon registration
        CURRENT_USER = {
            id: userData.user_id,
            name: userData.name,
            email: email,
            interests: userData.interests || "",
            emotional_preferences: userData.emotional_preferences || ""
        };
        
        closeLoginModal();
        updateAuthUI();
        alert('Account created successfully!');
    } catch (error) {
        console.error('Error during registration:', error);
        alert(error.message);
    }
}

async function loginCustomUser(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Login failed');
        }

        const userData = await response.json();
        CURRENT_USER = {
            id: userData.user_id,
            name: userData.name,
            email: email,
            interests: userData.interests || "",
            emotional_preferences: userData.emotional_preferences || "",
            latitude: userData.latitude,
            longitude: userData.longitude
        };

        // Sync location if we have it
        if (USER_LOCATION.lat !== 0) {
            updateUserLocationOnServer(CURRENT_USER.id, USER_LOCATION);
        }

        closeLoginModal();
        updateAuthUI();
        alert(`Logged in as ${CURRENT_USER.name}`);
        
        if (document.getElementById('circles-page').style.display === 'block') {
            fetchCircles();
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert(error.message);
    }
}

async function loginWithGoogle(email) {
    try {
        // Mocking the OAuth redirection and callback instantly
        const url = email 
            ? `${API_BASE_URL}/auth/callback/google?mock_email=${encodeURIComponent(email)}`
            : `${API_BASE_URL}/auth/callback/google`;
            
        const response = await fetch(url);
        if (!response.ok) throw new Error('Login failed');
        
        const userData = await response.json();
        CURRENT_USER = {
            id: userData.user_id,
            name: userData.name,
            email: userData.email,
            interests: userData.interests || "",
            emotional_preferences: userData.emotional_preferences || "",
            latitude: userData.latitude,
            longitude: userData.longitude
        };
        
        // Sync location if we have it
        if (USER_LOCATION.lat !== 0) {
            updateUserLocationOnServer(CURRENT_USER.id, USER_LOCATION);
        }

        closeLoginModal();
        updateAuthUI();
        alert(`Logged in as ${CURRENT_USER.name}`);
        
        // Refresh data if needed
        if (document.getElementById('circles-page').style.display === 'block') {
            fetchCircles();
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert('Could not log in.');
    }
}

function logout() {
    CURRENT_USER = null;
    updateAuthUI();
    alert('Logged out successfully');
}

function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    if (CURRENT_USER) {
        authSection.innerHTML = `
            <span style="margin-right: 15px; font-weight: 500;">Hi, ${CURRENT_USER.name}</span>
            <button class="btn-primary" onclick="logout()" style="padding: 5px 15px; font-size: 0.9em; background-color: transparent; border: 1px solid var(--primary-rose); color: var(--primary-rose);">Logout</button>
        `;
    } else {
        authSection.innerHTML = `<button class="btn-primary" onclick="openLoginModal()" style="padding: 5px 15px; font-size: 0.9em;">Login</button>`;
    }
}

async function fetchCircles() {
    const container = document.getElementById('circles-container');
    try {
        const response = await fetch(`${API_BASE_URL}/circles/`);
        if (!response.ok) throw new Error('Failed to fetch circles');
        const circles = await response.json();
        
        container.innerHTML = ''; // Clear loading state
        
        if (circles.length === 0) {
            container.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-grey);">No circles found. Be the first to create one!</p>';
            return;
        }

        circles.forEach(circle => {
            const card = document.createElement('div');
            card.className = 'card';
            // If user is logged in, we check if they are a member (simplistically for now)
            // In a real app, the API would return is_member for the current user
            card.innerHTML = `
                <h3>${circle.name}</h3>
                <p><i class="fa-solid fa-location-dot" style="color: var(--primary-rose)"></i> ${circle.location}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">${circle.description}</p>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-primary" style="font-size: 0.9em; padding: 6px 12px; background-color: transparent; border: 1px solid var(--primary-rose); color: var(--primary-rose);" onclick="showCircleDetail(${circle.id})">Details</button>
                    <button class="btn-primary" style="font-size: 0.9em; padding: 6px 12px;" onclick="joinCircle(${circle.id})">Join</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching circles:', error);
        container.innerHTML = '<p style="text-align: center; width: 100%; color: red;">Error loading circles.</p>';
    }
}

function openCreateCircleModal() {
    if (!CURRENT_USER) {
        openLoginModal();
        return;
    }
    document.getElementById('create-circle-modal').style.display = 'flex';
}

function closeCreateCircleModal() {
    document.getElementById('create-circle-modal').style.display = 'none';
    document.getElementById('create-circle-form').reset();
}

async function createCircle(event) {
    event.preventDefault();
    
    // Simplistic auth check (make sure at least user 1 exists)
    // In real app, rely on actual token/session
    
    const circleData = {
        name: document.getElementById('circle-name').value,
        description: document.getElementById('circle-description').value,
        location: document.getElementById('circle-location').value,
        creator_id: CURRENT_USER.id 
    };

    try {
        const response = await fetch(`${API_BASE_URL}/circles/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(circleData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create circle');
        }
        
        closeCreateCircleModal();
        fetchCircles(); // Reload the list
        alert('Circle created successfully!');
    } catch (error) {
        console.error('Error creating circle:', error);
        alert('Error creating circle: ' + error.message);
    }
}

async function joinCircle(circleId) {
    if (!CURRENT_USER) {
        openLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/circles/${circleId}/join?user_id=${CURRENT_USER.id}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to join circle');
        }

        alert('Joined successfully!');
        showCircleDetail(circleId); // Navigate to details
    } catch (error) {
        console.error('Error joining circle:', error);
        alert(error.message); // e.g. "Already a member"
    }
}

// --- Circle Detail Flow ---

async function showCircleDetail(circleId) {
    if (!CURRENT_USER) {
        openLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/circles/${circleId}`);
        if (!response.ok) throw new Error('Failed to fetch circle details');
        const circle = await response.json();

        // Update UI Text
        document.getElementById('detail-circle-name').innerText = circle.name;
        document.getElementById('detail-circle-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${circle.location}`;
        document.getElementById('detail-circle-description').innerText = circle.description;

        // Render Members
        const membersList = document.getElementById('detail-circle_members'); // Wait, named it differently in HTML? Let me check.
        // Actually I named it "detail-circle-members" in index.html. Fixing here:
        const membersContainer = document.getElementById('detail-circle-members');
        membersContainer.innerHTML = '';
        circle.members.forEach(member => {
            const mTag = document.createElement('div');
            mTag.style.display = 'flex';
            mTag.style.alignItems = 'center';
            mTag.style.gap = '10px';
            mTag.innerHTML = `
                <div style="width: 35px; height: 35px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: var(--primary-rose);">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span style="font-size: 0.9em;">${member.name}</span>
            `;
            membersContainer.appendChild(mTag);
        });

        // Fetch Meetups for this circle
        const meetupResponse = await fetch(`${API_BASE_URL}/meetups/circle/${circleId}`);
        const meetupsContainer = document.getElementById('detail-circle-meetups');
        meetupsContainer.innerHTML = '';
        
        if (meetupResponse.ok) {
            const meetups = await meetupResponse.json();
            if (meetups.length === 0) {
                meetupsContainer.innerHTML = '<p style="color: #aaa; font-size: 0.9em; text-align: center;">No upcoming meetups.</p>';
            } else {
                meetups.forEach(m => {
                    const mCard = document.createElement('div');
                    mCard.style.padding = '10px';
                    mCard.style.border = '1px solid #eee';
                    mCard.style.borderRadius = '8px';
                    mCard.innerHTML = `
                        <p style="font-weight: 600; font-size: 0.9em; margin-bottom: 5px;">${m.title}</p>
                        <p style="font-size: 0.8em; color: var(--text-grey);"><i class="fa-regular fa-calendar"></i> ${new Date(m.date_time).toLocaleDateString()}</p>
                    `;
                    meetupsContainer.appendChild(mCard);
                });
            }
        }

        // Setup Chat
        setupCircleChat(circleId);

        showPage('circle-detail-page');
    } catch (error) {
        console.error('Error showing circle detail:', error);
        alert('Could not load circle details.');
    }
}

function setupCircleChat(circleId) {
    if (CIRCLE_CHAT_WS) {
        CIRCLE_CHAT_WS.close();
    }

    // Connect to WebSocket
    // Note: Use ws:// for local testing
    CIRCLE_CHAT_WS = new WebSocket(`ws://127.0.0.1:8000/api/ws/circle/${circleId}`);
    
    const history = document.getElementById('circle-chat-history');
    history.innerHTML = '';

    CIRCLE_CHAT_WS.onmessage = function(event) {
        const data = event.data;
        const bubble = document.createElement('div');
        
        // Simplistic parsing "Name: content"
        const [sender, ...rest] = data.split(': ');
        const content = rest.join(': ');
        
        const isMe = sender === CURRENT_USER.name;
        
        bubble.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
        bubble.style.maxWidth = '80%';
        bubble.style.padding = '8px 12px';
        bubble.style.borderRadius = isMe ? '12px 12px 0 12px' : '12px 12px 12px 0';
        bubble.style.background = isMe ? 'var(--primary-rose)' : 'white';
        bubble.style.color = isMe ? 'white' : 'var(--text-dark)';
        bubble.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        
        bubble.innerHTML = `
            ${!isMe ? `<div style="font-size:0.7em; font-weight:700; margin-bottom:3px; color:var(--primary-rose)">${sender}</div>` : ''}
            <div style="font-size:0.9em;">${content || data}</div>
        `;
        
        history.appendChild(bubble);
        history.scrollTop = history.scrollHeight;
    };

    CIRCLE_CHAT_WS.onclose = function() {
        console.log("WebSocket closed");
    };
    
    CIRCLE_CHAT_WS.onerror = function(err) {
        console.error("WebSocket error:", err);
    };
}

function sendCircleMessage(event) {
    event.preventDefault();
    const input = document.getElementById('circle-chat-input');
    const msg = input.value.trim();
    if (!msg || !CIRCLE_CHAT_WS) return;

    // Protocol: "userId:message"
    CIRCLE_CHAT_WS.send(`${CURRENT_USER.id}:${msg}`);
    input.value = '';
}

// --- Advanced Meetups Logic ---

function initMap() {
    // This is called by the Google Maps script callback
    const mapContainer = document.getElementById('meetup-map');
    if (!mapContainer) return;

    // Default to a central point if no geolocation
    const defaultLoc = { lat: 20.5937, lng: 78.9629 }; // Central India as fallback
    
    G_MAP = new google.maps.Map(mapContainer, {
        zoom: 12,
        center: defaultLoc,
        styles: [
            { "featureType": "secondary", "stylers": [{ "color": "#fdf8f9" }] },
            { "featureType": "water", "stylers": [{ "color": "#e3f2fd" }] }
        ]
    });

    // Try HTML5 geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                USER_LOCATION = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                G_MAP.setCenter(USER_LOCATION);
                
                // Add a marker for the user
                new google.maps.Marker({
                    position: USER_LOCATION,
                    map: G_MAP,
                    title: "You are here",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#e91e63",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "white"
                    }
                });

                document.getElementById('current-location-text').innerText = "Current Location";
                
                // If logged in, sync to server
                if (CURRENT_USER) {
                    updateUserLocationOnServer(CURRENT_USER.id, USER_LOCATION);
                }

                fetchMeetups(); // Reload meetups with proximity context
                fetchUserLocations(); // Show other members
            },
            () => {
                console.warn("Geolocation denied or failed.");
                fetchUserLocations(); // Still show other members
            }
        );
    } else {
        fetchUserLocations();
    }
}

async function updateUserLocationOnServer(userId, loc) {
    try {
        await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: loc.lat,
                longitude: loc.lng
            })
        });
    } catch (e) {
        console.error("Failed to sync user location:", e);
    }
}

async function fetchUserLocations() {
    if (!G_MAP) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/locations`);
        if (!response.ok) throw new Error('Failed to fetch user locations');
        const locations = await response.json();
        
        // Clear old markers
        USER_MARKERS.forEach(m => m.setMap(null));
        USER_MARKERS = [];

        locations.forEach(user => {
            // Don't show current user as a pink pin (they are pink circle)
            if (CURRENT_USER && user.id === CURRENT_USER.id) return;

            const marker = new google.maps.Marker({
                position: { lat: user.lat, lng: user.lng },
                map: G_MAP,
                title: user.name,
                icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 5,
                    fillColor: "#ff4081",
                    fillOpacity: 0.8,
                    strokeWeight: 1,
                    strokeColor: "white"
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `<div style="padding: 10px;">
                            <h4 style="margin-bottom: 5px;">${user.name}</h4>
                            <p style="font-size: 0.8em; color: var(--primary-rose);">SheCircle Member</p>
                            <p style="font-size: 0.8em; margin-top: 5px;">Nearby and ready to connect!</p>
                         </div>`
            });

            marker.addListener("click", () => {
                infoWindow.open(G_MAP, marker);
            });

            USER_MARKERS.push(marker);
        });
    } catch (e) {
        console.error("Error fetching user locations:", e);
    }
}

async function fetchMeetups() {
    const container = document.getElementById('meetups-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/meetups/`);
        if (!response.ok) throw new Error('Failed to fetch meetups');
        const meetups = await response.json();
        
        container.innerHTML = '';
        clearMarkers();

        if (meetups.length === 0) {
            container.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-grey);">No meetups scheduled yet.</p>';
            return;
        }

        meetups.forEach(m => {
            // Check if user preferences match (mock matching)
            const isRecommended = CURRENT_USER && (
                (CURRENT_USER.interests && m.description.toLowerCase().includes(CURRENT_USER.interests.toLowerCase())) ||
                (CURRENT_USER.emotional_preferences && m.title.toLowerCase().includes(CURRENT_USER.emotional_preferences.toLowerCase()))
            );

            const card = document.createElement('div');
            card.className = 'card';
            if (isRecommended) card.style.borderLeft = '4px solid var(--primary-rose)';
            
            card.innerHTML = `
                ${isRecommended ? '<span style="font-size: 0.7em; background: var(--primary-rose); color: white; padding: 2px 8px; border-radius: 10px; position: absolute; top: -10px; left: 20px;">Recommended</span>' : ''}
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h3>${m.title}</h3>
                    ${m.professional_type ? `<span style="font-size: 0.7em; background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px;"><i class="fa-solid fa-user-tie"></i> ${m.professional_type}</span>` : ''}
                </div>
                <p><strong><i class="fa-regular fa-clock" style="color: var(--primary-rose)"></i> ${new Date(m.date_time).toLocaleString()}</strong></p>
                <p><i class="fa-solid fa-location-dot" style="color: var(--primary-rose)"></i> ${m.location}</p>
                <p style="font-size: 0.9em; margin-top: 10px; line-height: 1.4;">${m.description}</p>
                <button class="btn-primary" style="margin-top: 15px; width: 100%; justify-content: center;" onclick="rsvpMeetup(${m.id})">RSVP</button>
            `;
            container.appendChild(card);

            // Add Marker to Map if coordinates exist
            if (G_MAP && m.latitude && m.longitude) {
                const marker = new google.maps.Marker({
                    position: { lat: m.latitude, lng: m.longitude },
                    map: G_MAP,
                    title: m.title
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding: 10px;">
                                <h4 style="margin-bottom: 5px;">${m.title}</h4>
                                <p style="font-size: 0.8em;">${m.location}</p>
                                <p style="font-size: 0.8em; margin-top: 5px; color: var(--primary-rose);">${m.professional_type ? `Specialist: ${m.professional_type}` : ''}</p>
                             </div>`
                });

                marker.addListener("click", () => {
                    infoWindow.open(G_MAP, marker);
                });
                
                MAP_MARKERS.push(marker);
            }
        });
    } catch (error) {
        console.error('Error fetching meetups:', error);
    }
}

function clearMarkers() {
    MAP_MARKERS.forEach(m => m.setMap(null));
    MAP_MARKERS = [];
}

async function openMeetupModal() {
    if (!CURRENT_USER) {
        openLoginModal();
        return;
    }

    // Populate circles for selection
    const circleSelect = document.getElementById('meetup-circle-id');
    circleSelect.innerHTML = '<option value="">Loading your circles...</option>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/circles/`);
        const circles = await response.json();
        circleSelect.innerHTML = '';
        circles.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            circleSelect.appendChild(opt);
        });
    } catch (e) {
        circleSelect.innerHTML = '<option value="">Error loading circles</option>';
    }

    document.getElementById('meetup-modal').style.display = 'flex';
}

function closeMeetupModal() {
    document.getElementById('meetup-modal').style.display = 'none';
}

async function submitMeetup(event) {
    event.preventDefault();
    
    const meetupData = {
        title: document.getElementById('meetup-title').value,
        description: document.getElementById('meetup-desc').value,
        date_time: document.getElementById('meetup-time').value,
        location: document.getElementById('meetup-location-input').value,
        activity_type: "Community Event",
        circle_id: parseInt(document.getElementById('meetup-circle-id').value),
        creator_id: CURRENT_USER.id,
        professional_type: document.getElementById('meetup-pro').value || null,
        // Mocking coordinates near user or slightly offset if lat/lng available
        latitude: USER_LOCATION.lat + (Math.random() - 0.5) * 0.01,
        longitude: USER_LOCATION.lng + (Math.random() - 0.5) * 0.01
    };

    try {
        const response = await fetch(`${API_BASE_URL}/meetups/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meetupData)
        });

        if (!response.ok) throw new Error('Failed to create meetup');
        
        closeMeetupModal();
        fetchMeetups();
        alert('Meetup organized successfully!');
    } catch (error) {
        alert(error.message);
    }
}

async function rsvpMeetup(meetupId) {
    if (!CURRENT_USER) {
        openLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/meetups/${meetupId}/rsvp?user_id=${CURRENT_USER.id}`, {
            method: 'POST'
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'RSVP failed');
        }
        alert('RSVP confirmed!');
    } catch (error) {
        alert(error.message);
    }
}

// Anonymous Wall Logic
function openShareThoughtModal() {
    document.getElementById('share-thought-modal').style.display = 'flex';
}

function closeShareThoughtModal() {
    document.getElementById('share-thought-modal').style.display = 'none';
    document.getElementById('thought-input').value = '';
}

async function fetchPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();
        
        const container = document.getElementById('posts-container');
        container.innerHTML = '';
        
        posts.forEach(post => {
            const date = new Date(post.created_at).toLocaleString();
            const card = document.createElement('div');
            card.className = 'card relative-card';
            
            const reactions = post.reactions || {like: 0, empathy: 0, support: 0};
            
            card.innerHTML = `
                <button class="delete-btn" onclick="deletePost(${post.id})" title="Delete Post"><i class="fa-solid fa-trash"></i></button>
                <p style="font-size: 1.1em; font-style: italic; margin-top: 10px; color: var(--text-dark);">"${post.content}"</p>
                <p style="font-size: 0.8em; text-align: right; margin-top: 15px; color: var(--text-grey);">— ${post.author_name}, ${date}</p>
                <div class="post-actions">
                    <span onclick="reactToPost(${post.id}, 'like')">👍 ${reactions.like}</span>
                    <span onclick="reactToPost(${post.id}, 'empathy')">💖 ${reactions.empathy}</span>
                    <span onclick="reactToPost(${post.id}, 'support')">🤝 ${reactions.support}</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

async function submitThought() {
    const input = document.getElementById('thought-input');
    const content = input.value.trim();
    if (!content) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/posts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: content, 
                is_anonymous: true,
                author_id: CURRENT_USER ? CURRENT_USER.id : null
            })
        });
        
        if (response.ok) {
            closeShareThoughtModal();
            fetchPosts();
        } else {
            alert('Failed to share thought');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function reactToPost(postId, reactionType) {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reaction_type: reactionType })
        });
        if (response.ok) {
            fetchPosts();
        }
    } catch (error) {
        console.error('Error reacting to post:', error);
    }
}

async function deletePost(postId) {
    if(!confirm("Are you sure you want to delete this post?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            fetchPosts();
        }
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}
