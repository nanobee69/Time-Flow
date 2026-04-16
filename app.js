// StudyFlow Application Logic
class StudyFlow {
    constructor() {
        this.timer = {
            startTime: 0,
            elapsed: 0,
            interval: null,
            isRunning: false
        };

        this.data = [];
        this.currentMonth = ''; // YYYY-MM
        this.chart = null;

        // DOM Elements
        this.display = document.getElementById('display');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.logBtn = document.getElementById('logBtn');
        this.monthSelect = document.getElementById('monthSelect');
        this.logBody = document.getElementById('logBody');
        this.addRowBtn = document.getElementById('addRowBtn');
        this.entryModal = document.getElementById('entryModal');
        this.entryForm = document.getElementById('entryForm');
        this.closeModal = document.getElementById('closeModal');

        this.init();
        this.startLiveClock();
    }

    startLiveClock() {
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            
            document.getElementById('liveClock').textContent = timeStr;
            document.getElementById('liveDate').textContent = dateStr;
        };
        update();
        setInterval(update, 1000);
    }

    init() {
        // Set current month to today
        const now = new Date();
        this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.monthSelect.value = this.currentMonth;

        // Event Listeners
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.logBtn.addEventListener('click', () => this.logSession());
        this.monthSelect.addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
            this.loadData();
        });

        this.addRowBtn.addEventListener('click', () => this.openModal());
        this.closeModal.addEventListener('click', () => this.closeModalFn());
        this.entryForm.addEventListener('submit', (e) => this.saveEntry(e));

        // Initialize Data and Chart
        this.loadData();
        this.initChart();
    }

    // --- Timer Logic ---
    startTimer() {
        if (!this.timer.isRunning) {
            this.timer.isRunning = true;
            this.timer.startTime = Date.now() - this.timer.elapsed;
            this.timer.interval = setInterval(() => {
                this.timer.elapsed = Date.now() - this.timer.startTime;
                this.updateDisplay();
            }, 100);

            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
        }
    }

    pauseTimer() {
        if (this.timer.isRunning) {
            this.timer.isRunning = false;
            clearInterval(this.timer.interval);
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
        }
    }

    resetTimer() {
        this.pauseTimer();
        this.timer.elapsed = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        const totalSeconds = Math.floor(this.timer.elapsed / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        this.display.textContent = 
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    logSession() {
        if (this.timer.elapsed < 1000) return; // Don't log less than 1 second

        const hours = (this.timer.elapsed / 3600000).toFixed(2);
        const now = new Date();
        const localDate = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
        const logMonth = localDate.substring(0, 7); // YYYY-MM

        // If we're logging to a different month than currently viewed, switch view
        if (this.currentMonth !== logMonth) {
            this.currentMonth = logMonth;
            this.monthSelect.value = logMonth;
            this.loadData();
        }

        // Check if entry for today exists in the now-correct this.data
        const existingIndex = this.data.findIndex(entry => entry.date === localDate);
        
        if (existingIndex > -1) {
            this.data[existingIndex].hours = (parseFloat(this.data[existingIndex].hours) + parseFloat(hours)).toFixed(2);
        } else {
            this.data.push({
                date: localDate,
                hours: hours,
                notes: 'Timed session'
            });
        }

        this.saveData();
        this.resetTimer();
        alert(`Logged ${hours}h to your record!`);
    }

    // --- Data Logic ---
    loadData() {
        const storageKey = `study_flow_${this.currentMonth}`;
        const stored = localStorage.getItem(storageKey);
        this.data = stored ? JSON.parse(stored) : [];
        this.renderTable();
        this.updateSummary();
        this.updateChart();
    }

    saveData() {
        const storageKey = `study_flow_${this.currentMonth}`;
        // Ensure data is sorted by date
        this.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem(storageKey, JSON.stringify(this.data));
        this.renderTable();
        this.updateSummary();
        this.updateChart();
    }

    renderTable() {
        this.logBody.innerHTML = '';
        this.data.forEach((entry, index) => {
            const dateObj = new Date(entry.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.date}</td>
                <td>${dayName}</td>
                <td>${entry.hours}h</td>
                <td>${entry.notes || '-'}</td>
                <td class="actions">
                    <button class="delete-btn" data-index="${index}" title="Delete entry">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            `;
            
            // Add click to edit functionality
            tr.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-btn');
                if (deleteBtn) {
                    const idx = deleteBtn.getAttribute('data-index');
                    this.deleteEntry(parseInt(idx));
                } else {
                    this.openModal(index);
                }
            });
            this.logBody.appendChild(tr);
        });
    }

    deleteEntry(index) {
        this.data.splice(index, 1);
        this.saveData();
    }

    updateSummary() {
        const total = this.data.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
        const count = this.data.length;
        const avg = count > 0 ? total / count : 0;

        document.getElementById('totalHours').textContent = `${total.toFixed(1)}h`;
        document.getElementById('dailyAvg').textContent = `${avg.toFixed(1)}h`;
        document.getElementById('daysTracked').textContent = count;
    }

    // --- Modal Logic ---
    openModal(index = -1) {
        this.entryModal.classList.add('active');
        if (index > -1) {
            const entry = this.data[index];
            document.getElementById('modalTitle').textContent = 'Edit Entry';
            document.getElementById('editIndex').value = index;
            document.getElementById('entryDate').value = entry.date;
            document.getElementById('entryHours').value = entry.hours;
            document.getElementById('entryNotes').value = entry.notes;
        } else {
            document.getElementById('modalTitle').textContent = 'Add Entry';
            document.getElementById('editIndex').value = -1;
            document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('entryHours').value = '';
            document.getElementById('entryNotes').value = '';
        }
    }

    closeModalFn() {
        this.entryModal.classList.remove('active');
    }

    saveEntry(e) {
        e.preventDefault();
        const index = parseInt(document.getElementById('editIndex').value);
        const entry = {
            date: document.getElementById('entryDate').value,
            hours: parseFloat(document.getElementById('entryHours').value).toFixed(2),
            notes: document.getElementById('entryNotes').value
        };

        // Check if entry date belongs to currently selected month
        if (!entry.date.startsWith(this.currentMonth)) {
            alert('Date must be within the selected month!');
            return;
        }

        if (index > -1) {
            this.data[index] = entry;
        } else {
            this.data.push(entry);
        }

        this.saveData();
        this.closeModalFn();
    }

    // --- Chart Logic ---
    initChart() {
        const ctx = document.getElementById('studyChart').getContext('2d');
        
        // Create dynamic gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(122, 162, 247, 0.2)');
        gradient.addColorStop(1, 'rgba(122, 162, 247, 0)');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Will be 1-31
                datasets: [{
                    label: 'Study Hours',
                    data: [],
                    borderColor: '#7aa2f7',
                    borderWidth: 2,
                    pointBackgroundColor: '#bb9af7',
                    pointBorderColor: '#fff',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4 // Smooth line
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#24283b',
                        titleColor: '#9aa5ce',
                        bodyColor: '#c0caf5',
                        borderColor: '#414868',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 16,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: { color: '#9aa5ce', font: { family: 'JetBrains Mono' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9aa5ce', font: { family: 'JetBrains Mono' } }
                    }
                }
            }
        });
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const [year, month] = this.currentMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const hoursData = new Array(daysInMonth).fill(0);

        this.data.forEach(entry => {
            const day = new Date(entry.date).getDate();
            if (day <= daysInMonth) {
                hoursData[day - 1] = parseFloat(entry.hours);
            }
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = hoursData;
        this.chart.update();
    }
}

// Initialize App
const app = new StudyFlow();
