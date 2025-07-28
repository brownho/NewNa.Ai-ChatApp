// Global variables
let recentTraffic = [];
let charts = {};
let autoRefreshInterval;
let currentFilter = { model: '', ip: '' };

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    refreshData();
    loadAvailableLogFiles();
    
    // Auto-refresh every 5 seconds
    autoRefreshInterval = setInterval(refreshData, 5000);
    
    // Event listeners
    document.getElementById('model-filter').addEventListener('change', applyFilters);
    document.getElementById('ip-filter').addEventListener('input', applyFilters);
    
    // Initialize WebSocket for real-time updates
    initializeWebSocket();
});

// Initialize Chart.js charts
function initializeCharts() {
    // Chart defaults
    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = '#2a2a2a';
    
    // Hourly distribution chart
    const hourlyCtx = document.getElementById('hourly-chart').getContext('2d');
    charts.hourly = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Requests',
                data: new Array(24).fill(0),
                backgroundColor: '#007bff',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#2a2a2a' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
    
    // Model usage chart
    const modelCtx = document.getElementById('model-chart').getContext('2d');
    charts.model = new Chart(modelCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#007bff', '#28a745', '#ffc107', '#dc3545', 
                    '#6c757d', '#17a2b8', '#6610f2', '#e83e8c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // Browser distribution chart
    const browserCtx = document.getElementById('browser-chart').getContext('2d');
    charts.browser = new Chart(browserCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#007bff', '#28a745', '#ffc107', '#dc3545', 
                    '#6c757d', '#17a2b8'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // OS distribution chart
    const osCtx = document.getElementById('os-chart').getContext('2d');
    charts.os = new Chart(osCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#007bff', '#28a745', '#ffc107', '#dc3545', 
                    '#6c757d', '#17a2b8'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Refresh dashboard data
async function refreshData() {
    try {
        // Fetch recent traffic
        const recentResponse = await fetch('/api/traffic/recent');
        const recentData = await recentResponse.json();
        recentTraffic = recentData.entries;
        
        // Fetch statistics
        const statsResponse = await fetch('/api/traffic/stats');
        const stats = await statsResponse.json();
        
        // Update statistics cards
        updateStatistics(stats);
        
        // Update charts
        updateCharts(stats);
        
        // Update traffic table
        updateTrafficTable();
        
        // Update model filter options
        updateModelFilter(stats.modelUsage);
        
        // Update last refresh time
        document.getElementById('last-update').textContent = 
            `Last updated: ${new Date().toLocaleTimeString()}`;
            
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// Update statistics cards
function updateStatistics(stats) {
    document.getElementById('total-requests').textContent = stats.totalRequests;
    document.getElementById('unique-ips').textContent = `${stats.uniqueIPs} unique IPs`;
    document.getElementById('avg-response-time').textContent = `${stats.averageResponseTime}ms`;
    document.getElementById('total-tokens').textContent = formatNumber(stats.totalTokens);
    
    const tokensPerRequest = stats.totalRequests > 0 
        ? Math.round(stats.totalTokens / stats.totalRequests) 
        : 0;
    document.getElementById('tokens-per-request').textContent = `${tokensPerRequest} per request`;
    
    const errorRate = stats.totalRequests > 0 
        ? ((stats.errorCount / stats.totalRequests) * 100).toFixed(1) 
        : 0;
    document.getElementById('error-rate').textContent = `${errorRate}%`;
    document.getElementById('error-count').textContent = `${stats.errorCount} errors`;
}

// Update charts with new data
function updateCharts(stats) {
    // Update hourly distribution
    const hourlyData = new Array(24).fill(0);
    Object.entries(stats.hourlyDistribution).forEach(([hour, count]) => {
        hourlyData[parseInt(hour)] = count;
    });
    charts.hourly.data.datasets[0].data = hourlyData;
    charts.hourly.update();
    
    // Update model usage
    const modelLabels = Object.keys(stats.modelUsage);
    const modelData = Object.values(stats.modelUsage);
    charts.model.data.labels = modelLabels;
    charts.model.data.datasets[0].data = modelData;
    charts.model.update();
    
    // Update browser distribution
    const browserLabels = Object.keys(stats.browserStats);
    const browserData = Object.values(stats.browserStats);
    charts.browser.data.labels = browserLabels;
    charts.browser.data.datasets[0].data = browserData;
    charts.browser.update();
    
    // Update OS distribution
    const osLabels = Object.keys(stats.osStats);
    const osData = Object.values(stats.osStats);
    charts.os.data.labels = osLabels;
    charts.os.data.datasets[0].data = osData;
    charts.os.update();
}

// Update traffic table
function updateTrafficTable() {
    const tbody = document.getElementById('traffic-tbody');
    tbody.innerHTML = '';
    
    // Filter traffic
    let filteredTraffic = recentTraffic;
    if (currentFilter.model) {
        filteredTraffic = filteredTraffic.filter(entry => entry.model === currentFilter.model);
    }
    if (currentFilter.ip) {
        filteredTraffic = filteredTraffic.filter(entry => 
            entry.ip.toLowerCase().includes(currentFilter.ip.toLowerCase())
        );
    }
    
    // Display first 100 entries
    filteredTraffic.slice(0, 100).forEach(entry => {
        const row = createTrafficRow(entry);
        tbody.appendChild(row);
    });
}

// Create a table row for traffic entry
function createTrafficRow(entry) {
    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(entry.timestamp).toLocaleString();
    
    // Format messages preview
    const messagesPreview = entry.messages
        .map(m => `${m.role}: ${m.content.substring(0, 50)}...`)
        .join(' | ');
    
    // Status indicator
    const statusClass = entry.status < 400 ? 'status-success' : 'status-error';
    const statusText = entry.status || 'pending';
    
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${entry.ip}</td>
        <td>${entry.model}</td>
        <td class="message-preview" onclick="showMessageDetails('${entry.id}')">${messagesPreview}</td>
        <td>${entry.responseTime ? entry.responseTime + 'ms' : '-'}</td>
        <td>${entry.tokensGenerated || 0}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${entry.metadata?.browser || '-'} / ${entry.metadata?.os || '-'}</td>
    `;
    
    return row;
}

// Show message details in modal
function showMessageDetails(entryId) {
    const entry = recentTraffic.find(e => e.id === entryId);
    if (!entry) return;
    
    const modal = document.getElementById('message-modal');
    const content = document.getElementById('modal-content');
    
    // Format the entry for display
    const formattedEntry = {
        id: entry.id,
        timestamp: entry.timestamp,
        ip: entry.ip,
        model: entry.model,
        messages: entry.messages,
        options: entry.options,
        responseTime: entry.responseTime,
        tokensGenerated: entry.tokensGenerated,
        status: entry.status,
        metadata: entry.metadata
    };
    
    content.innerHTML = `<pre>${JSON.stringify(formattedEntry, null, 2)}</pre>`;
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('message-modal').style.display = 'none';
}

// Apply filters
function applyFilters() {
    currentFilter.model = document.getElementById('model-filter').value;
    currentFilter.ip = document.getElementById('ip-filter').value;
    updateTrafficTable();
}

// Update model filter options
function updateModelFilter(modelUsage) {
    const select = document.getElementById('model-filter');
    const searchSelect = document.getElementById('search-model');
    const currentValue = select.value;
    
    // Clear existing options (except "All Models")
    select.innerHTML = '<option value="">All Models</option>';
    searchSelect.innerHTML = '<option value="">All Models</option>';
    
    // Add model options
    Object.keys(modelUsage).forEach(model => {
        const option = `<option value="${model}">${model}</option>`;
        select.innerHTML += option;
        searchSelect.innerHTML += option;
    });
    
    // Restore previous selection
    select.value = currentValue;
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load available log files
async function loadAvailableLogFiles() {
    try {
        const response = await fetch('/api/traffic/logs');
        const files = await response.json();
        
        const select = document.getElementById('log-file-select');
        select.innerHTML = '<option value="">Select a log file</option>';
        
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.filename;
            option.textContent = `${file.date} (${formatFileSize(file.size)})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading log files:', error);
    }
}

// Load selected log file
async function loadLogFile() {
    const filename = document.getElementById('log-file-select').value;
    if (!filename) return;
    
    try {
        const response = await fetch(`/api/traffic/logs/${filename}`);
        const data = await response.json();
        
        // Update info
        document.getElementById('log-info').textContent = 
            `Loaded ${data.length} entries from ${filename}`;
        
        // Update table
        const tbody = document.getElementById('log-tbody');
        tbody.innerHTML = '';
        
        data.slice(0, 500).forEach(entry => {
            const row = createLogRow(entry);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading log file:', error);
    }
}

// Create a table row for log entry
function createLogRow(entry) {
    const row = document.createElement('tr');
    
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const messagesPreview = entry.messages
        .map(m => `${m.role}: ${m.content.substring(0, 50)}...`)
        .join(' | ');
    
    row.innerHTML = `
        <td>${timestamp}</td>
        <td>${entry.ip}</td>
        <td>${entry.model}</td>
        <td class="message-preview">${messagesPreview}</td>
        <td>${entry.responseTime ? entry.responseTime + 'ms' : '-'}</td>
        <td>${entry.tokensGenerated || 0}</td>
        <td>${entry.status || '-'}</td>
    `;
    
    return row;
}

// Perform search
async function performSearch() {
    const searchData = {
        query: document.getElementById('search-query').value,
        startDate: document.getElementById('search-start-date').value,
        endDate: document.getElementById('search-end-date').value,
        ip: document.getElementById('search-ip').value,
        model: document.getElementById('search-model').value
    };
    
    try {
        const response = await fetch('/api/traffic/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchData)
        });
        
        const result = await response.json();
        
        // Update info
        document.getElementById('search-results-info').textContent = 
            `Found ${result.count} matching entries`;
        
        // Update table
        const tbody = document.getElementById('search-tbody');
        tbody.innerHTML = '';
        
        result.results.forEach(entry => {
            const row = createLogRow(entry);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error performing search:', error);
    }
}

// Export current data as CSV
function exportCurrentData() {
    const data = currentFilter.model || currentFilter.ip 
        ? recentTraffic.filter(entry => {
            if (currentFilter.model && entry.model !== currentFilter.model) return false;
            if (currentFilter.ip && !entry.ip.includes(currentFilter.ip)) return false;
            return true;
          })
        : recentTraffic;
    
    // Create CSV
    const csv = [
        'Timestamp,IP,Model,Messages,Response Time,Tokens,Status,Browser,OS',
        ...data.map(entry => {
            const messages = entry.messages
                .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
                .join(' | ');
            return [
                entry.timestamp,
                entry.ip,
                entry.model,
                `"${messages.replace(/"/g, '""')}"`,
                entry.responseTime || '',
                entry.tokensGenerated || 0,
                entry.status || '',
                entry.metadata?.browser || '',
                entry.metadata?.os || ''
            ].join(',');
        })
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Download log file
function downloadLogFile() {
    const filename = document.getElementById('log-file-select').value;
    if (!filename) return;
    
    window.location.href = `/api/traffic/export/${filename}`;
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatFileSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('message-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Initialize WebSocket connection
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('WebSocket connected for real-time traffic monitoring');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Handle traffic events
            if (data.type === 'traffic' && data.event === 'traffic') {
                const entry = data.data;
                
                // Add to recent traffic
                recentTraffic.unshift(entry);
                if (recentTraffic.length > 1000) {
                    recentTraffic.pop();
                }
                
                // Update table if on live tab
                const liveTab = document.getElementById('live-tab');
                if (liveTab.classList.contains('active')) {
                    // Add new row at the top
                    const tbody = document.getElementById('traffic-tbody');
                    const newRow = createTrafficRow(entry);
                    tbody.insertBefore(newRow, tbody.firstChild);
                    
                    // Remove last row if more than 100
                    if (tbody.children.length > 100) {
                        tbody.removeChild(tbody.lastChild);
                    }
                    
                    // Flash the new row
                    newRow.style.backgroundColor = '#007bff22';
                    setTimeout(() => {
                        newRow.style.backgroundColor = '';
                        newRow.style.transition = 'background-color 0.5s';
                    }, 100);
                }
                
                // Update statistics every 10 new entries
                if (recentTraffic.length % 10 === 0) {
                    refreshData();
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 5 seconds...');
        setTimeout(initializeWebSocket, 5000);
    };
}