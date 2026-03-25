// Ensure user is logged in
const userStr = localStorage.getItem('strahms_user');
if (!userStr) {
    window.location.href = 'index.html';
}
const user = JSON.parse(userStr);
const API_BASE = 'http://localhost:3000/api';

// --- Navigation Logic ---
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.content-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        // Add active to clicked and target section
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-target'));
        if (target) {
            target.classList.add('active');
            if (btn.getAttribute('data-target') === 'section-weekly') {
                renderChart();
            }
        }
    });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('strahms_user');
    window.location.href = 'index.html';
});

// --- Constants & Global State ---
let isTracking = false;
let trackingInterval;
let breakInterval;
let sessionSeconds = 0; // Current session time
let totalTodayMinutes = 0; // Fetched from backend or local
let continuousMinutes = 0; // For break reminder
let sessionId = null;

// UI Elements
const timerDisplay = document.getElementById('live-timer');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const riskBadge = document.getElementById('risk-badge');
const riskMessage = document.getElementById('risk-message');
const todayTotalDisplay = document.getElementById('today-total-hours');
const timerCircle = document.getElementById('timer-circle');
const breakModal = document.getElementById('break-modal');

// Format seconds into HH:MM:SS
function formatTime(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Format minutes into Xh Ym
function formatMinutes(min) {
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h}h ${m}m`;
}

// Determine Risk
function updateRiskUI(totalMins) {
    const hours = totalMins / 60;
    
    todayTotalDisplay.textContent = formatMinutes(totalMins);

    if (hours < 3) {
        riskBadge.textContent = 'Low Risk';
        riskBadge.style.backgroundColor = 'var(--risk-low)';
        riskMessage.textContent = 'Healthy usage. Keep it up!';
        timerCircle.style.background = `conic-gradient(var(--risk-low) 0%, var(--bg-color) 0%)`;
    } else if (hours >= 3 && hours <= 6) {
        riskBadge.textContent = 'Moderate Risk';
        riskBadge.style.backgroundColor = 'var(--risk-mod)';
        riskMessage.textContent = 'Monitor your screen time. Take breaks.';
        timerCircle.style.background = `conic-gradient(var(--risk-mod) 0%, var(--bg-color) 0%)`;
    } else {
        riskBadge.textContent = 'High Risk';
        riskBadge.style.backgroundColor = 'var(--risk-high)';
        riskMessage.textContent = 'Take a break immediately!';
        timerCircle.style.background = `conic-gradient(var(--risk-high) 0%, var(--bg-color) 0%)`;
    }
}

// Load Today's Data
async function loadTodayData() {
    try {
        const res = await fetch(`${API_BASE}/screen/today/${user.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        totalTodayMinutes = data.totalMinutes;
    } catch {
        // Fallback
        const todayStr = new Date().toDateString();
        const localData = JSON.parse(localStorage.getItem('strahms_today') || '{}');
        if (localData.date === todayStr) {
            totalTodayMinutes = localData.minutes || 0;
        } else {
            totalTodayMinutes = 0;
        }
    }
    updateRiskUI(totalTodayMinutes);
}

// Fallback Start Session
function startLocalSession() {
    sessionSeconds = 0;
    isTracking = true;
    timerInterval();
}

// Timer Logic
function timerInterval() {
    btnStart.disabled = true;
    btnStop.disabled = false;
    timerCircle.classList.add('pulse'); // simple css animation class if you want

    trackingInterval = setInterval(() => {
        sessionSeconds++;
        timerDisplay.textContent = formatTime(sessionSeconds);
        
        // Every 60 seconds (1 min), update total today and continuous
        if (sessionSeconds > 0 && sessionSeconds % 60 === 0) {
            totalTodayMinutes++;
            continuousMinutes++;
            updateRiskUI(totalTodayMinutes);
            
            // Check for break
            if (continuousMinutes >= 45) {
                showBreakModal();
            }
        }
    }, 1000);
}

// Stop Timer
async function stopSession() {
    clearInterval(trackingInterval);
    isTracking = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    
    const minutesAdded = Math.floor(sessionSeconds / 60);
    
    try {
        if (sessionId) {
            await fetch(`${API_BASE}/screen/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            sessionId = null;
        }
    } catch (e) {
        // Save locally
        const todayStr = new Date().toDateString();
        localStorage.setItem('strahms_today', JSON.stringify({
            date: todayStr,
            minutes: totalTodayMinutes
        }));
    // Also save dummy weekly data
    let localWeekly = JSON.parse(localStorage.getItem('strahms_weekly') || '[]');
        if(localWeekly.length === 0) {
            localWeekly = [120, 180, 240, 90, 60, 300, totalTodayMinutes];
        } else {
            localWeekly[6] = totalTodayMinutes;
        }
        localStorage.setItem('strahms_weekly', JSON.stringify(localWeekly));
    }
    
    sessionSeconds = 0;
    continuousMinutes = 0;
    timerDisplay.textContent = "00:00:00";
}

btnStart.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_BASE}/screen/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        sessionId = data.sessionId;
        startLocalSession();
    } catch {
        startLocalSession();
    }
});

btnStop.addEventListener('click', stopSession);


// --- Break Reminder Modal ---
function showBreakModal() {
    breakModal.classList.add('active');
    continuousMinutes = 0; // Reset after showing
}

document.getElementById('btn-dismiss').addEventListener('click', () => {
    breakModal.classList.remove('active');
});

document.getElementById('btn-snooze').addEventListener('click', () => {
    breakModal.classList.remove('active');
    // Snooze: It will trigger again in 10 minutes realistically, meaning we set continuous to 35
    continuousMinutes = 35; 
});


// --- Weekly Chart (Chart.js) ---
let chartInstance = null;
async function renderChart() {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    // Labels for past 7 days
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' })); // Mon, Tue, etc.
    }

    let dataPoints = [];
    try {
        const res = await fetch(`${API_BASE}/screen/weekly/${user.id}`);
        if(!res.ok) throw new Error();
        const data = await res.json();
        // Process data to match exactly 7 days (mocking logic here for simplicity if missing)
        dataPoints = data.weeklyData.map(d => d.totalMinutes / 60);
        while(dataPoints.length < 7) dataPoints.unshift(0);
        if(dataPoints.length > 7) dataPoints = dataPoints.slice(-7);
    } catch {
        // Mock data
        const localWeekly = JSON.parse(localStorage.getItem('strahms_weekly') || '[120, 180, 240, 90, 60, 300, 0]');
        dataPoints = localWeekly.map(m => m / 60); 
    }

    const weeklyTotalHours = dataPoints.reduce((a, b) => a + b, 0);
    const recommended = getRecommendedLimit(user.occupation);
    
    document.getElementById('weekly-total-text').textContent = `${weeklyTotalHours.toFixed(1)} hours`;
    document.getElementById('recommended-limit-text').textContent = `${recommended} hours`;
    
    const diff = recommended - weeklyTotalHours;
    const diffEl = document.getElementById('weekly-difference-text');
    if (diff >= 0) {
        diffEl.textContent = `${diff.toFixed(1)}h under limit`;
        diffEl.className = 'text-success';
    } else {
        diffEl.textContent = `${Math.abs(diff).toFixed(1)}h over limit`;
        diffEl.className = 'text-danger';
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Screen Time (Hours)',
                data: dataPoints,
                backgroundColor: 'rgba(255, 140, 66, 0.7)', // Primary soft orange
                borderColor: 'rgba(255, 140, 66, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Hours' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function getRecommendedLimit(occupation) {
    if (occupation === 'Student') return 35; // Example higher limit
    if (occupation === 'Office Worker') return 45; 
    return 28; // Normal / Other
}

// --- User Profile ---
document.getElementById('profile-name').value = user.username;
document.getElementById('profile-age').value = user.age || '';
document.getElementById('profile-occupation').value = user.occupation || 'Normal User';

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    user.username = document.getElementById('profile-name').value;
    user.age = document.getElementById('profile-age').value;
    user.occupation = document.getElementById('profile-occupation').value;
    
    localStorage.setItem('strahms_user', JSON.stringify(user));
    
    const msg = document.getElementById('profile-msg');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
});

// Initialize Dashboard
loadTodayData();
