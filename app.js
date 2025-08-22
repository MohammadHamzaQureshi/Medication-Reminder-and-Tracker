// MedTracker JavaScript Application
class MedTracker {
    constructor() {
        this.medications = this.loadMedications();
        this.currentEditId = null;
        this.initializeApp();
        this.bindEvents();
        this.requestNotificationPermission();
        this.startNotificationTimer();
    }

    initializeApp() {
        this.renderMedications();
        this.updateProgress();
        this.checkWelcomeScreen();
        this.initializeTheme();
    }

    loadMedications() {
        const stored = localStorage.getItem('medtracker-medications');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    }

    saveMedications() {
        localStorage.setItem('medtracker-medications', JSON.stringify(this.medications));
    }

    checkWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const dashboard = document.getElementById('dashboard');

        if (this.medications.length === 0) {
            welcomeScreen.classList.remove('hidden');
            dashboard.classList.add('hidden');
        } else {
            welcomeScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
        }
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('medtracker-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');

        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeToggle(theme);
    }

    updateThemeToggle(theme) {
        const toggle = document.getElementById('themeToggle');
        toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    bindEvents() {
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('addMedBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                this.closeModal();
            }
        });

        document.getElementById('medicationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMedication();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('medtracker-theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    openModal(medicationId = null) {
        const modal = document.getElementById('modalOverlay');
        const form = document.getElementById('medicationForm');
        const title = document.getElementById('modalTitle');
        const saveText = document.getElementById('saveText');

        this.currentEditId = medicationId;

        if (medicationId) {
            const medication = this.medications.find(m => m.id === medicationId);
            if (medication) {
                title.textContent = 'Edit Medication';
                saveText.textContent = 'Update Medication';
                document.getElementById('medName').value = medication.name;
                document.getElementById('medDosage').value = medication.dosage;
                document.getElementById('medTime').value = medication.time;
                document.getElementById('medFrequency').value = medication.frequency;
            }
        } else {
            title.textContent = 'Add Medication';
            saveText.textContent = 'Save Medication';
            form.reset();
            const now = new Date();
            const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                             now.getMinutes().toString().padStart(2, '0');
            document.getElementById('medTime').value = timeString;
        }

        modal.classList.remove('hidden');
        document.getElementById('medName').focus();
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modalOverlay');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        this.currentEditId = null;
    }

    saveMedication() {
        const name = document.getElementById('medName').value.trim();
        const dosage = document.getElementById('medDosage').value.trim();
        const time = document.getElementById('medTime').value;
        const frequency = document.getElementById('medFrequency').value;

        if (!name || !dosage || !time || !frequency) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const medicationData = {
            name,
            dosage,
            time,
            frequency,
            taken: false,
            lastTaken: null
        };

        if (this.currentEditId) {
            const index = this.medications.findIndex(m => m.id === this.currentEditId);
            if (index !== -1) {
                this.medications[index] = { ...this.medications[index], ...medicationData };
                this.showToast('Medication updated successfully', 'success');
            }
        } else {
            const medication = {
                id: Date.now(),
                createdAt: new Date().toISOString(),
                ...medicationData
            };
            this.medications.push(medication);
            this.showToast('Medication added successfully', 'success');
        }

        this.saveMedications();
        this.renderMedications();
        this.updateProgress();
        this.checkWelcomeScreen();
        this.closeModal();
    }

    renderMedications() {
        const grid = document.getElementById('medicationsGrid');

        if (this.medications.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-style: italic;">No medications added yet. Click "Add Medication" to get started.</p>';
            return;
        }

        grid.innerHTML = this.medications.map(med => this.createMedicationCard(med)).join('');

        this.medications.forEach(med => {
            const takeBtn = document.getElementById(`take-${med.id}`);
            const editBtn = document.getElementById(`edit-${med.id}`);
            const deleteBtn = document.getElementById(`delete-${med.id}`);

            if (takeBtn) {
                takeBtn.addEventListener('click', () => this.toggleMedication(med.id));
            }
            if (editBtn) {
                editBtn.addEventListener('click', () => this.openModal(med.id));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteMedication(med.id));
            }
        });
    }

    createMedicationCard(medication) {
        const isToday = this.isTakenToday(medication);
        const statusClass = isToday ? 'taken' : '';
        const statusText = isToday ? 'Taken Today' : 'Pending';
        const statusIcon = isToday ? '✅' : '⏰';
        const statusStyle = isToday ? 'status-taken' : 'status-pending';
        const actionText = isToday ? 'Mark as Not Taken' : 'Take Now';
        const actionClass = isToday ? 'btn-secondary' : 'btn-success';

        return `
            <div class="medication-card ${statusClass}">
                <div class="medication-header">
                    <h4 class="medication-name">${this.escapeHtml(medication.name)}</h4>
                    <span class="medication-status ${statusStyle}">
                        <span>${statusIcon}</span>
                        ${statusText}
                    </span>
                </div>

                <div class="medication-details">
                    <div class="medication-detail">
                        <span>💊</span>
                        <span>${this.escapeHtml(medication.dosage)}</span>
                    </div>
                    <div class="medication-detail">
                        <span>⏰</span>
                        <span>${this.formatTime(medication.time)}</span>
                    </div>
                    <div class="medication-detail">
                        <span>📅</span>
                        <span>${medication.frequency}</span>
                    </div>
                    ${medication.lastTaken ? `
                        <div class="medication-detail">
                            <span>🕒</span>
                            <span>Last taken: ${this.formatDateTime(medication.lastTaken)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="medication-actions">
                    <button id="take-${medication.id}" class="btn ${actionClass} btn-sm">
                        ${actionText}
                    </button>
                    <button id="edit-${medication.id}" class="btn btn-secondary btn-sm">
                        Edit
                    </button>
                    <button id="delete-${medication.id}" class="btn btn-danger btn-sm">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    toggleMedication(id) {
        const medication = this.medications.find(m => m.id === id);
        if (!medication) return;

        const wasAlreadyTaken = this.isTakenToday(medication);

        if (wasAlreadyTaken) {
            medication.taken = false;
            medication.lastTaken = null;
            this.showToast(`${medication.name} marked as not taken`, 'warning');
        } else {
            medication.taken = true;
            medication.lastTaken = new Date().toISOString();
            this.showToast(`✅ ${medication.name} marked as taken!`, 'success');
        }

        this.saveMedications();
        this.renderMedications();
        this.updateProgress();
    }

    deleteMedication(id) {
        const medication = this.medications.find(m => m.id === id);
        if (!medication) return;

        if (confirm(`Are you sure you want to delete "${medication.name}"?`)) {
            this.medications = this.medications.filter(m => m.id !== id);
            this.saveMedications();
            this.renderMedications();
            this.updateProgress();
            this.checkWelcomeScreen();
            this.showToast('Medication deleted', 'warning');
        }
    }

    isTakenToday(medication) {
        if (!medication.lastTaken) return false;

        const lastTaken = new Date(medication.lastTaken);
        const today = new Date();

        return lastTaken.toDateString() === today.toDateString();
    }

    updateProgress() {
        const total = this.medications.length;
        const taken = this.medications.filter(m => this.isTakenToday(m)).length;
        const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

        const progressRing = document.getElementById('progressRing');
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (percentage / 100) * circumference;
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRing.style.strokeDashoffset = offset;

        document.getElementById('progressPercent').textContent = `${percentage}%`;
        document.getElementById('takenCount').textContent = taken;
        document.getElementById('totalCount').textContent = total;
        document.getElementById('streakCount').textContent = this.calculateStreak();
    }

    calculateStreak() {
        const completionRate = this.medications.length > 0 ? 
            this.medications.filter(m => this.isTakenToday(m)).length / this.medications.length : 0;
        return completionRate === 1 ? 1 : 0;
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showToast('Notifications enabled! You will be reminded to take your medications.', 'success');
            }
        }
    }

    startNotificationTimer() {
        setInterval(() => {
            this.checkForReminders();
        }, 60000);
    }

    checkForReminders() {
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');

        this.medications.forEach(medication => {
            if (medication.time === currentTime && !this.isTakenToday(medication)) {
                this.sendNotification(medication);
            }
        });
    }

    sendNotification(medication) {
        if (Notification.permission === 'granted') {
            const notification = new Notification('💊 Medication Reminder', {
                body: `Time to take ${medication.name} (${medication.dosage})`,
                icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E💊%3C/text%3E%3C/svg%3E'
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 10000);
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    formatDateTime(isoString) {
        const date = new Date(isoString);
        const time = this.formatTime(date.toTimeString().slice(0, 5));
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${time}`;
        } else {
            return `${date.toLocaleDateString()} at ${time}`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MedTracker();
});
