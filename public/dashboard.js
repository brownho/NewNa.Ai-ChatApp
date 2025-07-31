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
            this.setupEventListeners();
            
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
            
            console.log('Auth check response:', response.status);
            
            if (response.ok) {
                const user = await response.json();
                console.log('Authenticated user:', user);
                // Check if user is the authorized admin
                if (user.username === 'sabrown0812' && user.email === 'sabrown0812@gmail.com') {
                    this.isAuthenticated = true;
                    console.log('User is admin');
                } else {
                    console.log('User is not admin:', user.username, user.email);
                    this.showUnauthorized();
                }
            } else {
                console.log('Auth response not ok:', response.status);
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
                console.log('Loaded activities:', activities);
                this.displayActivity(activities);
            } else {
                console.error('Activity response not ok:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error details:', errorText);
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
        
        // Store activities for modal access
        this.activities = activities;
        
        tbody.innerHTML = activities.map((activity, index) => {
            const userBadge = activity.userType === 'guest' 
                ? '<span class="user-badge guest-badge">Guest</span>' 
                : '<span class="user-badge auth-badge">Auth</span>';
                
            return `
                <tr class="clickable-row" onclick="dashboard.showRequestDetails(${index})">
                    <td>${this.formatTime(activity.timestamp)}</td>
                    <td>${this.escapeHtml(activity.username || 'Guest')}${userBadge}</td>
                    <td>${this.escapeHtml(activity.action)}</td>
                    <td>${this.escapeHtml(activity.details || '--')}</td>
                    <td>${activity.response_time || '--'}ms</td>
                </tr>
            `;
        }).join('');
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
    
    showRequestDetails(index) {
        const activity = this.activities[index];
        if (!activity) return;
        
        const modalBody = document.getElementById('modalBody');
        
        // Format messages for display
        const messagesHtml = activity.messages && activity.messages.length > 0
            ? `<div class="messages-container">
                ${activity.messages.map((msg, i) => `
                    <div class="message-item">
                        <strong>Message ${i + 1} (${msg.role}):</strong><br>
                        ${this.escapeHtml(msg.content)}
                    </div>
                `).join('')}
               </div>`
            : '<div class="detail-value">No messages</div>';
        
        // Format metadata
        const metadataHtml = activity.metadata 
            ? `<div class="detail-row">
                <div class="detail-label">Browser:</div>
                <div class="detail-value">${activity.metadata.browser || 'Unknown'}</div>
               </div>
               <div class="detail-row">
                <div class="detail-label">Operating System:</div>
                <div class="detail-value">${activity.metadata.os || 'Unknown'}</div>
               </div>
               <div class="detail-row">
                <div class="detail-label">User Agent:</div>
                <div class="detail-value">${activity.metadata.userAgent || 'Unknown'}</div>
               </div>`
            : '';
        
        modalBody.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Request ID:</div>
                <div class="detail-value">${activity.id || '--'}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Timestamp:</div>
                <div class="detail-value">${this.formatDate(activity.timestamp)}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">User Type:</div>
                <div class="detail-value">
                    ${activity.userType === 'guest' 
                        ? '<span class="user-badge guest-badge">Guest User</span>' 
                        : '<span class="user-badge auth-badge">Authenticated User</span>'}
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Username:</div>
                <div class="detail-value">${activity.username || 'Guest'}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">IP Address:</div>
                <div class="detail-value">${activity.ip || '--'}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Model:</div>
                <div class="detail-value">${activity.model || 'default'}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Response Time:</div>
                <div class="detail-value">${activity.response_time || '--'}ms</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Tokens Generated:</div>
                <div class="detail-value">${activity.tokensGenerated || '--'}</div>
            </div>
            
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">${activity.status || '--'}</div>
            </div>
            
            ${metadataHtml}
            
            <div class="detail-row">
                <div class="detail-label">Messages:</div>
                ${messagesHtml}
            </div>
            
            ${activity.error ? `
                <div class="detail-row">
                    <div class="detail-label" style="color: #f56565;">Error:</div>
                    <div class="detail-value">${this.escapeHtml(activity.error)}</div>
                </div>
            ` : ''}
        `;
        
        // Show modal
        document.getElementById('requestModal').style.display = 'flex';
    }
    
    closeRequestModal() {
        document.getElementById('requestModal').style.display = 'none';
    }
    
    setupEventListeners() {
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('requestModal').style.display === 'flex') {
                this.closeRequestModal();
            }
        });
        
        // Close modal on background click
        document.getElementById('requestModal').addEventListener('click', (e) => {
            if (e.target.id === 'requestModal') {
                this.closeRequestModal();
            }
        });
    }
    
    async runAnalyticsQuery() {
        const endpoint = document.getElementById('analyticsEndpoint').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const resultsDiv = document.getElementById('queryResults');
        
        // Show loading state
        resultsDiv.innerHTML = '<p class="loading">Running query...</p>';
        
        try {
            // Build URL with query parameters
            const url = new URL(endpoint, window.location.origin);
            if (startDate) url.searchParams.append('startDate', startDate);
            if (endDate) url.searchParams.append('endDate', endDate);
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Display results based on endpoint type
            if (endpoint.includes('overview')) {
                this.displayOverviewResults(data);
            } else if (endpoint.includes('models')) {
                this.displayModelResults(data);
            } else if (endpoint.includes('users')) {
                this.displayUserResults(data);
            } else if (endpoint.includes('hourly')) {
                this.displayHourlyResults(data);
            } else {
                // Default JSON display
                resultsDiv.innerHTML = `<h3>Results</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
            }
        } catch (error) {
            resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }
    
    displayOverviewResults(data) {
        const resultsDiv = document.getElementById('queryResults');
        resultsDiv.innerHTML = `
            <h3>Overview Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <h4>Total Requests</h4>
                    <div class="value">${data.totalRequests || 0}</div>
                </div>
                <div class="stat-item">
                    <h4>Unique Users</h4>
                    <div class="value">${data.uniqueUsers || 0}</div>
                </div>
                <div class="stat-item">
                    <h4>Guest Requests</h4>
                    <div class="value">${data.guestRequests || 0}</div>
                </div>
                <div class="stat-item">
                    <h4>Authenticated Requests</h4>
                    <div class="value">${data.authenticatedRequests || 0}</div>
                </div>
                <div class="stat-item">
                    <h4>Avg Response Time</h4>
                    <div class="value">${Math.round(data.avgResponseTime || 0)}ms</div>
                </div>
                <div class="stat-item">
                    <h4>Error Rate</h4>
                    <div class="value">${data.errorRate || 0}%</div>
                </div>
            </div>
        `;
    }
    
    displayModelResults(data) {
        const resultsDiv = document.getElementById('queryResults');
        const models = data.models || [];
        
        resultsDiv.innerHTML = `
            <h3>Model Usage Statistics</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Model</th>
                        <th style="text-align: right;">Requests</th>
                        <th style="text-align: right;">Avg Response Time</th>
                        <th style="text-align: right;">Total Tokens</th>
                    </tr>
                </thead>
                <tbody>
                    ${models.map(model => `
                        <tr>
                            <td>${this.escapeHtml(model.model)}</td>
                            <td style="text-align: right;">${model.request_count}</td>
                            <td style="text-align: right;">${Math.round(model.avg_response_time || 0)}ms</td>
                            <td style="text-align: right;">${model.total_tokens || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    displayUserResults(data) {
        const resultsDiv = document.getElementById('queryResults');
        const users = data.users || [];
        
        resultsDiv.innerHTML = `
            <h3>User Activity Statistics</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Username</th>
                        <th style="text-align: left;">Type</th>
                        <th style="text-align: right;">Requests</th>
                        <th style="text-align: right;">Avg Response Time</th>
                        <th style="text-align: right;">Total Tokens</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${this.escapeHtml(user.username || 'Guest')}</td>
                            <td>${user.user_type === 'guest' ? 
                                '<span class="user-badge guest-badge">Guest</span>' : 
                                '<span class="user-badge auth-badge">Authenticated</span>'}</td>
                            <td style="text-align: right;">${user.request_count}</td>
                            <td style="text-align: right;">${Math.round(user.avg_response_time || 0)}ms</td>
                            <td style="text-align: right;">${user.total_tokens || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    displayHourlyResults(data) {
        const resultsDiv = document.getElementById('queryResults');
        const hourlyData = data.hourlyTraffic || [];
        
        resultsDiv.innerHTML = `
            <h3>Hourly Traffic Statistics</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Hour</th>
                        <th style="text-align: right;">Requests</th>
                        <th style="text-align: right;">Unique Users</th>
                        <th style="text-align: right;">Errors</th>
                    </tr>
                </thead>
                <tbody>
                    ${hourlyData.map(hour => `
                        <tr>
                            <td>${hour.hour}</td>
                            <td style="text-align: right;">${hour.request_count}</td>
                            <td style="text-align: right;">${hour.unique_users || 0}</td>
                            <td style="text-align: right;">${hour.error_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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