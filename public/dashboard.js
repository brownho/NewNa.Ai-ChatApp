class Dashboard {
    constructor() {
        this.trafficChart = null;
        this.isAuthenticated = false;
        this.refreshInterval = null;
        this.init();
    }
    
    async init() {
        // Check authentication
        await this.checkAuth();
        
        if (this.isAuthenticated) {
            this.showDashboard();
            this.setupChart();
            this.loadAllData();
            
            // Auto-refresh every 30 seconds
            this.refreshInterval = setInterval(() => {
                this.loadAllData();
            }, 30000);
        }
    }
    
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/user', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const user = await response.json();
                // Check if user is the authorized admin
                if (user.username === 'sabrown0812' && user.email === 'sabrown0812@gmail.com') {
                    this.isAuthenticated = true;
                } else {
                    this.showUnauthorized();
                }
            } else {
                this.showAuthRequired();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthRequired();
        }
    }
    
    showAuthRequired() {
        document.getElementById('authCheck').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';
    }
    
    showUnauthorized() {
        document.getElementById('authCheck').innerHTML = `
            <div class="auth-required">
                <h2>Access Denied</h2>
                <p>You do not have permission to view the admin dashboard.</p>
                <p>This area is restricted to authorized administrators only.</p>
                <a href="/" class="login-btn">Return to Chat</a>
            </div>
        `;
        document.getElementById('authCheck').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('authCheck').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
    }
    
    async loadAllData() {
        this.updateLastUpdated();
        
        // Load all data in parallel
        await Promise.all([
            this.loadStats(),
            this.loadTrafficData(),
            this.loadUsers(),
            this.loadActivity(),
            this.loadSystemStatus()
        ]);
    }
    
    updateLastUpdated() {
        const now = new Date().toLocaleString();
        document.getElementById('lastUpdated').textContent = now;
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/dashboard/stats', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const stats = await response.json();
                
                // Update stat cards
                this.updateStatCard('totalUsers', stats.totalUsers, stats.userChange);
                this.updateStatCard('activeSessions', stats.activeSessions, stats.sessionChange);
                this.updateStatCard('totalMessages', stats.totalMessages, stats.messageChange);
                this.updateStatCard('apiRequests', stats.apiRequestsToday, stats.apiChange);
                this.updateStatCard('avgResponseTime', stats.avgResponseTime + 'ms', stats.responseTimeChange);
                this.updateStatCard('dbSize', this.formatBytes(stats.dbSize), null);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    updateStatCard(id, value, change) {
        document.getElementById(id).textContent = value || '--';
        
        if (change !== null && change !== undefined) {
            const changeElement = document.getElementById(id + 'Change');
            if (changeElement) {
                const prefix = change >= 0 ? '+' : '';
                changeElement.textContent = `${prefix}${change}% from yesterday`;
                changeElement.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        }
    }
    
    async loadTrafficData() {
        try {
            const response = await fetch('/api/dashboard/traffic', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update traffic metrics
                document.getElementById('peakHour').textContent = data.peakHour || '--';
                document.getElementById('uniqueVisitors').textContent = data.uniqueVisitors || '--';
                document.getElementById('errorRate').textContent = (data.errorRate || 0) + '%';
                
                // Update chart
                this.updateTrafficChart(data.hourlyTraffic);
            }
        } catch (error) {
            console.error('Failed to load traffic data:', error);
        }
    }
    
    setupChart() {
        const ctx = document.getElementById('trafficChart').getContext('2d');
        
        this.trafficChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Requests',
                    data: [],
                    borderColor: '#9F7AEA',
                    backgroundColor: 'rgba(159, 122, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#999'
                        }
                    },
                    x: {
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#999'
                        }
                    }
                }
            }
        });
    }
    
    updateTrafficChart(hourlyData) {
        if (!this.trafficChart || !hourlyData) return;
        
        const labels = [];
        const data = [];
        
        // Last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date();
            hour.setHours(hour.getHours() - i);
            labels.push(hour.getHours() + ':00');
            data.push(hourlyData[23 - i] || 0);
        }
        
        this.trafficChart.data.labels = labels;
        this.trafficChart.data.datasets[0].data = data;
        this.trafficChart.update();
    }
    
    async loadUsers() {
        try {
            const response = await fetch('/api/dashboard/users', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }
    
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${user.total_messages || 0}</td>
                <td>${this.formatDate(user.last_active)}</td>
                <td>
                    <span class="status-indicator ${user.is_active ? 'status-online' : 'status-offline'}"></span>
                    ${user.is_active ? 'Active' : 'Inactive'}
                </td>
            </tr>
        `).join('');
    }
    
    async loadActivity() {
        try {
            const response = await fetch('/api/dashboard/activity', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const activities = await response.json();
                this.displayActivity(activities);
            }
        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }
    
    displayActivity(activities) {
        const tbody = document.getElementById('activityTableBody');
        
        if (!activities || activities.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No recent activity</td></tr>';
            return;
        }
        
        tbody.innerHTML = activities.map(activity => `
            <tr>
                <td>${this.formatTime(activity.timestamp)}</td>
                <td>${this.escapeHtml(activity.username || 'Guest')}</td>
                <td>${this.escapeHtml(activity.action)}</td>
                <td>${this.escapeHtml(activity.details || '--')}</td>
                <td>${activity.response_time || '--'}ms</td>
            </tr>
        `).join('');
    }
    
    async loadSystemStatus() {
        try {
            const response = await fetch('/api/dashboard/system', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const status = await response.json();
                
                // Update system metrics
                document.getElementById('ollamaStatus').textContent = status.ollamaStatus || 'Unknown';
                document.getElementById('availableModels').textContent = status.availableModels || '--';
                document.getElementById('dbStatus').textContent = status.dbStatus || 'Unknown';
                document.getElementById('serverUptime').textContent = this.formatUptime(status.uptime);
                document.getElementById('memoryUsage').textContent = `${status.memoryUsage || '--'}%`;
                document.getElementById('cpuUsage').textContent = `${status.cpuUsage || '--'}%`;
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
        }
    }
    
    // Refresh methods
    async refreshTraffic() {
        await this.loadTrafficData();
    }
    
    async refreshUsers() {
        await this.loadUsers();
    }
    
    async refreshActivity() {
        await this.loadActivity();
    }
    
    // Utility methods
    formatBytes(bytes) {
        if (!bytes) return '--';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    formatTime(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleTimeString();
    }
    
    formatUptime(seconds) {
        if (!seconds) return '--';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.trafficChart) {
            this.trafficChart.destroy();
        }
    }
}

// Initialize dashboard
const dashboard = new Dashboard();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    dashboard.destroy();
});