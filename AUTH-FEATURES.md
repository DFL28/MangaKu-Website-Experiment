# Authentication and Bookmark/History Features

## Overview
This document summarizes the authentication and user data features implemented for the manga website.

## Features Implemented

### 1. User Authentication System
- **Registration**: Users can create new accounts
- **Login**: Users can log in with their credentials
- **JWT Tokens**: Secure authentication using JSON Web Tokens
- **Session Management**: Token storage in localStorage

### 2. Bookmark System
- **Add Bookmarks**: Logged-in users can bookmark manga
- **View Bookmarks**: Access all bookmarked manga in one place
- **Server Storage**: Bookmarks saved to server for persistence
- **Local Storage Fallback**: For immediate access and offline support

### 3. Reading History System
- **Track Reading**: Automatically track manga reading history
- **View History**: Access reading history with timestamps
- **Server Storage**: History saved to server for persistence
- **Local Storage Fallback**: For immediate access and offline support

### 4. UI Integration
- **Hamburger Menu Login**: Login/logout button in the side menu
- **Responsive Design**: Works on all device sizes
- **Bookmark Page**: Dedicated page for managing bookmarks and history
- **Visual Feedback**: Loading states and success/error messages

## Technical Implementation

### Frontend Components
1. **Login Page** (`login.html`/`login.js`) - User authentication interface
2. **Registration Page** (`register.html`/`register.js`) - User registration interface
3. **Bookmark Page** (`bookmark.html`) - Manage bookmarks and history
4. **Index Page** (`index.html`) - Hamburger menu with auth integration
5. **Script Updates** (`script.js`) - Integrated bookmark/history managers

### Backend Components
1. **API Server** (`api-server.js`) - Authentication and data endpoints
2. **JWT Implementation** - Secure token-based authentication
3. **User Data Storage** - In-memory storage for bookmarks/history

### Key Functions

#### Authentication
- `login()` - Authenticate user and store token
- `logout()` - Remove token and clear session
- `updateAuthMenuItem()` - Update UI based on auth state

#### Bookmark Management
- `BookmarkManager.add()` - Add manga to bookmarks
- `BookmarkManager.remove()` - Remove manga from bookmarks
- `BookmarkManager.saveToServer()` - Save bookmarks to server

#### History Management
- `HistoryManager.add()` - Add reading history entry
- `HistoryManager.saveToServer()` - Save history to server

## API Endpoints

### Authentication
- `POST /register` - Create new user account
- `POST /login` - Authenticate user and return token

### User Data
- `GET /api/user/bookmarks` - Retrieve user bookmarks
- `POST /api/user/bookmarks` - Add bookmark
- `GET /api/user/history` - Retrieve reading history
- `POST /api/user/history` - Add history entry

## Usage Flow

1. **User Registration**
   - Visit `register.html`
   - Enter username and password
   - Submit form to create account

2. **User Login**
   - Visit `login.html` or click Login in hamburger menu
   - Enter credentials
   - Receive JWT token for authenticated requests

3. **Bookmark Manga**
   - Browse manga on `index.html`
   - Click bookmark button on manga cards
   - Bookmarks saved to server and localStorage

4. **View Bookmarks/History**
   - Visit `bookmark.html`
   - Switch between Bookmark and History tabs
   - View/manage saved data

5. **Logout**
   - Click Logout in hamburger menu
   - Token removed from localStorage
   - Redirected to login page

## Security Considerations

- **JWT Tokens**: Secure, time-limited authentication tokens
- **Token Storage**: Stored in localStorage (client-side)
- **Protected Endpoints**: API endpoints require valid tokens
- **Automatic Logout**: On authentication errors

## Future Improvements

1. **Persistent Server Storage**: Replace in-memory storage with database
2. **Password Hashing**: Secure password storage
3. **Remember Me**: Extended session options
4. **Social Login**: Google/Facebook authentication
5. **Account Management**: Profile settings and password reset