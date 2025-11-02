# MangaKu Admin Guide

This guide explains how to use the admin features of the MangaKu website.

## Admin Access

To access the admin dashboard:

1. Navigate to `/login.html`
2. Use the default admin credentials:
   - Username: `admin`
   - Password: `admin123`
3. After successful login, you will be redirected to the admin dashboard at `/admin.html`

**Important:** Change the default admin password immediately after first login for security.

## Admin Dashboard Features

### Server Status Monitoring
- View real-time server status
- Monitor memory usage
- Track active users
- Check server uptime

### Server Management
- **Restart Server**: Safely restart the application server
- **Clear Cache**: Clear all cached data to free up memory

### User Management
- View all registered users
- See user roles
- Monitor user activity status

### Proxy Management
- View proxy statistics
- Monitor proxy performance
- Check success/failure rates

## Security Features

### Login Security
- Rate limiting to prevent brute force attacks
- Account lockout after 5 failed attempts
- Automatic unlock after 15 minutes

### Application Security
- XSS protection headers
- CSRF protection
- CORS configuration
- Hidden server information

### Data Protection
- Passwords are not exposed in API responses
- Sensitive information is masked in logs
- Session management with JWT tokens

## Changing Admin Credentials

To change the admin password:

1. Edit `api-server.js`
2. Find the users array:
   ```javascript
   const users = [
       { username: 'admin', password: 'admin123', role: 'admin' }
   ];
   ```
3. Change the password value
4. Restart the server

## Best Practices

### Password Security
- Use strong, unique passwords
- Change passwords regularly
- Never share admin credentials

### Server Management
- Monitor server resources regularly
- Clear cache periodically to maintain performance
- Restart server during low-traffic periods

### Access Control
- Limit admin access to trusted personnel only
- Log out when leaving the dashboard
- Use secure connections (HTTPS) in production

## Troubleshooting

### Cannot Access Admin Dashboard
1. Verify you're using the correct credentials
2. Check if your account is locked (wait 15 minutes)
3. Ensure the server is running properly

### Server Restart Issues
1. Check PM2 logs for errors
2. Verify the restart script has proper permissions
3. Ensure no other processes are blocking the restart

### Performance Issues
1. Clear cache using the admin panel
2. Check proxy performance statistics
3. Monitor memory usage and consider server upgrade if needed