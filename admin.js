// Check if user is admin on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verify admin token
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // If not authorized, redirect to login
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }
        
        // Load dashboard data
        loadDashboardData();
        loadUsers();
        loadProxyStats();
        loadSystemLogs();
        
        // Set up tab navigation
        setupTabs();
        
        // Set up form handlers
        setupFormHandlers();
    } catch (error) {
        console.error('Admin verification failed:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});

// Set up tab navigation
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Set up form handlers
function setupFormHandlers() {
    // Add user form
    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const role = document.getElementById('new-role').value;
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password, role })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                document.getElementById('add-user-form').reset();
                loadUsers(); // Refresh user list
            } else {
                const error = await response.json();
                alert('Failed to add user: ' + error.message);
            }
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Error adding user: ' + error.message);
        }
    });
    
    // Add proxy form
    document.getElementById('add-proxy-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const proxyUrl = document.getElementById('proxy-url').value;
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/proxy/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ proxy: proxyUrl })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                document.getElementById('add-proxy-form').reset();
                loadProxyStats(); // Refresh proxy stats
            } else {
                const error = await response.json();
                alert('Failed to add proxy: ' + error.message);
            }
        } catch (error) {
            console.error('Error adding proxy:', error);
            alert('Error adding proxy: ' + error.message);
        }
    });
    
    // System settings form
    document.getElementById('system-settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        alert('System settings would be saved in a real implementation.');
    });
    
    // Change admin password form
    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-admin-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const token = localStorage.getItem('token');
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                document.getElementById('change-password-form').reset();
            } else {
                const error = await response.json();
                alert('Failed to change password: ' + error.message);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Error changing password: ' + error.message);
        }
    });
    
    // User password change form
    document.getElementById('user-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('target-username').value;
        const newPassword = document.getElementById('user-new-password').value;
        const confirmPassword = document.getElementById('user-confirm-password').value;
        const token = localStorage.getItem('token');
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/user-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, newPassword })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                document.getElementById('user-password-form').reset();
                closeModal('change-password-modal');
                loadUsers(); // Refresh user list
            } else {
                const error = await response.json();
                alert('Failed to change password: ' + error.message);
            }
        } catch (error) {
            console.error('Error changing user password:', error);
            alert('Error changing user password: ' + error.message);
        }
    });
    
    // Refresh proxy stats button
    document.getElementById('refresh-proxy-stats').addEventListener('click', loadProxyStats);
    
    // Reset failed proxies button
    document.getElementById('reset-failed-proxies').addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/proxy/reset', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                loadProxyStats(); // Refresh proxy stats
            } else {
                const error = await response.json();
                alert('Failed to reset proxies: ' + error.message);
            }
        } catch (error) {
            console.error('Error resetting proxies:', error);
            alert('Error resetting proxies: ' + error.message);
        }
    });
    
    // Clear logs button
    document.getElementById('clear-logs-btn').addEventListener('click', () => {
        document.getElementById('system-logs').innerHTML = 'Logs cleared.';
    });
    
    // Database management buttons
    document.getElementById('backup-db').addEventListener('click', () => {
        alert('Database backup would start in a real implementation.');
    });
    
    document.getElementById('restore-db').addEventListener('click', () => {
        alert('Database restore would start in a real implementation.');
    });
    
    document.getElementById('optimize-db').addEventListener('click', () => {
        alert('Database optimization would start in a real implementation.');
    });
    
    // Modal close button
    document.querySelector('#change-password-modal .close').addEventListener('click', () => {
        closeModal('change-password-modal');
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('change-password-modal');
        if (event.target === modal) {
            closeModal('change-password-modal');
        }
    });
}

// Modal functions
function openModal(modalId, username) {
    document.getElementById('target-username').value = username;
    document.getElementById('user-new-password').value = '';
    document.getElementById('user-confirm-password').value = '';
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    try {
        // Get server stats
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const { data } = await response.json();
            
            // Update server status
            document.getElementById('server-status').innerHTML = '<span class="status-indicator status-up"></span> Online';
            
            // Update memory usage with more detailed information
            const memoryUsagePercent = ((data.memory.heapUsed / data.memory.heapTotal) * 100).toFixed(1);
            const memoryUsedMB = (data.memory.heapUsed / 1024 / 1024).toFixed(1);
            const memoryTotalMB = (data.memory.heapTotal / 1024 / 1024).toFixed(1);
            
            document.getElementById('memory-usage').textContent = `${memoryUsagePercent}%`;
            document.getElementById('memory-usage-bar').style.width = `${memoryUsagePercent}%`;
            
            // Add tooltip with detailed memory info
            document.getElementById('memory-usage').title = `${memoryUsedMB} MB / ${memoryTotalMB} MB`;
            
            // Update uptime with more detailed information
            const uptime = formatUptime(data.uptime);
            const uptimeSeconds = Math.floor(data.uptime);
            document.getElementById('uptime').textContent = uptime;
            document.getElementById('uptime').title = `${uptimeSeconds} seconds`;
            
            // Update platform info
            document.getElementById('platform').textContent = `${data.platform} (${data.arch})`;
            document.getElementById('node-version').textContent = data.nodeVersion;
            document.getElementById('pid').textContent = data.pid;
            
            // Update active users
            updateActiveUsers();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('server-status').innerHTML = '<span class="status-indicator status-down"></span> Error';
    }
}

// Format uptime to human readable format
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 3600));
    seconds %= 24 * 3600;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else {
        return `${minutes}m ${seconds}s`;
    }
}

// Update active users count
async function updateActiveUsers() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/active-users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const { data } = await response.json();
            document.getElementById('active-users').textContent = data.count;
        }
    } catch (error) {
        console.error('Error updating active users:', error);
    }
}

// Load users
async function loadUsers() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const { data } = await response.json();
            const tableBody = document.getElementById('users-table');
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = data.map(user => `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td><span class="status-indicator status-up"></span> Active</td>
                    <td>-</td>
                    <td class="actions-cell">
                        <button class="btn-admin" style="padding: 5px 10px; font-size: 0.9em;" onclick="openModal('change-password-modal', '${user.username}')">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn-admin btn-danger" style="padding: 5px 10px; font-size: 0.9em;" onclick="deleteUser('${user.username}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-table').innerHTML = '<tr><td colspan="5" style="text-align: center;">Error loading users</td></tr>';
    }
}

// Delete user
async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/users/' + username, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            loadUsers(); // Refresh user list
        } else {
            const error = await response.json();
            alert('Failed to delete user: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Load proxy stats
async function loadProxyStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/proxy/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const { data } = await response.json();
            const proxyStats = document.getElementById('proxy-stats');
            
            proxyStats.innerHTML = `
                <div class="server-stats">
                    <div class="stat-item">
                        <div class="label">Total Proxies</div>
                        <div class="value">${data.total}</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Active Proxies</div>
                        <div class="value">${data.active}</div>
                    </div>
                    <div class="stat-item">
                        <div class="label">Failed Proxies</div>
                        <div class="value">${data.failed}</div>
                    </div>
                </div>
                
                <table style="margin-top: 15px;">
                    <thead>
                        <tr>
                            <th>Proxy</th>
                            <th>Success</th>
                            <th>Failed</th>
                            <th>Success Rate</th>
                            <th>Avg Response</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.proxies.map(proxy => `
                            <tr>
                                <td>${proxy.proxy}</td>
                                <td>${proxy.success}</td>
                                <td>${proxy.failed}</td>
                                <td>${proxy.successRate}</td>
                                <td>${proxy.avgResponseTime}</td>
                                <td>
                                    ${proxy.isFailed ? 
                                        '<span class="status-indicator status-down"></span> Failed' : 
                                        '<span class="status-indicator status-up"></span> Active'}
                                </td>
                                <td class="actions-cell">
                                    <button class="btn-admin btn-danger" style="padding: 5px 10px; font-size: 0.9em;" onclick="removeProxy('${proxy.proxy}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading proxy stats:', error);
        document.getElementById('proxy-stats').innerHTML = 'Error loading proxy statistics';
    }
}

// Remove proxy
async function removeProxy(proxyUrl) {
    if (!confirm(`Are you sure you want to remove proxy ${proxyUrl}?`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/proxy/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ proxy: proxyUrl })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            loadProxyStats(); // Refresh proxy stats
        } else {
            const error = await response.json();
            alert('Failed to remove proxy: ' + error.message);
        }
    } catch (error) {
        console.error('Error removing proxy:', error);
        alert('Error removing proxy: ' + error.message);
    }
}

// Load system logs
async function loadSystemLogs() {
    // In a real implementation, this would fetch actual logs from the server
    const logsContainer = document.getElementById('system-logs');
    
    // Add timestamp to show when logs were last updated
    const timestamp = new Date().toISOString();
    
    // Get current log content
    let currentLogs = logsContainer.innerHTML;
    
    // If this is the first load, show initial logs
    if (currentLogs.includes('Loading logs...')) {
        currentLogs = `[${timestamp}] Server started successfully
[${timestamp}] Proxy manager initialized
[${timestamp}] Metadata store initialized
[${timestamp}] API server listening on port 3000
`;
    }
    
    // Add periodic update message
    const updateMessage = `[${timestamp}] Dashboard refreshed\n`;
    
    // Update logs with new information
    logsContainer.innerHTML = updateMessage + currentLogs;
    
    // Limit log size to prevent memory issues
    if (logsContainer.innerHTML.length > 10000) {
        logsContainer.innerHTML = logsContainer.innerHTML.substring(0, 10000);
    }
    
    // Scroll to top to show latest update
    logsContainer.scrollTop = 0;
}

// Event listeners for buttons
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

document.getElementById('restart-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to restart the server? This will temporarily make the website unavailable.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/admin/restart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Server restart initiated. The website will be temporarily unavailable.');
            // Logout user after restart
            setTimeout(() => {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }, 2000);
        } else {
            const error = await response.json();
            alert('Failed to restart server: ' + error.message);
        }
    } catch (error) {
        console.error('Error restarting server:', error);
        alert('Error restarting server: ' + error.message);
    }
});

document.getElementById('clear-cache-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all cache? This may temporarily slow down the website.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/cache/clear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            // Reload dashboard data
            loadDashboardData();
        } else {
            const error = await response.json();
            alert('Failed to clear cache: ' + error.message);
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Error clearing cache: ' + error.message);
    }
});

// Auto-refresh dashboard data every 10 seconds for more real-time updates
setInterval(() => {
    loadDashboardData();
    loadProxyStats();
    updateActiveUsers();
    loadSystemLogs(); // Update logs more frequently
}, 10000);