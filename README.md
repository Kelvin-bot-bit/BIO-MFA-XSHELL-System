# 🛡️ Secure Multi-Factor Biometric Authentication System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens)
![OpenCV](https://img.shields.io/badge/OpenCV-Facial%20Recognition-5C3EE8?style=for-the-badge&logo=opencv)
![Security](https://img.shields.io/badge/Cybersecurity-Focused-red?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

*A modern authentication platform implementing biometric verification and multi-factor authentication using facial recognition, JWT security, email OTP verification and secure password authentication.*

</div>

---

# 📖 Overview

The **Secure Multi-Factor Biometric Authentication System** is a full-stack authentication platform developed to strengthen user identity verification by combining **something the user knows (password)**, **something the user has (OTP)**, and **something the user is (facial biometrics)**.

The project demonstrates secure authentication practices commonly used in modern cybersecurity applications while protecting against unauthorized access, credential theft, brute-force attacks and identity impersonation.

The application follows secure development principles and demonstrates practical implementation of authentication technologies suitable for enterprise environments.

---

# ✨ Key Features

## 🔐 Authentication

- User Registration
- Secure Login
- Email Verification
- Password Hashing
- JWT Authentication
- Session Management
- Role-Based Authorization

---

## 👤 Biometric Security

- Face Registration
- Face Verification
- Face Encoding Storage
- Facial Recognition Login
- Multiple Face Detection
- Confidence Threshold Validation
- Duplicate Face Prevention

---

## 🔑 Multi-Factor Authentication

- Password Authentication
- Email One-Time Password (OTP)
- Facial Recognition Verification
- JWT Access Tokens
- Secure Logout

---

## 🛡️ Security Features

- Password Hashing (bcrypt)
- JWT Token Authentication
- Environment Variable Protection
- Secure Session Management
- Protected API Endpoints
- Input Validation
- SQL Injection Protection
- CORS Protection
- Authentication Middleware
- Token Expiration
- Secure Secret Key Management

---

# 🏗️ System Architecture

```
                User
                  │
                  ▼
      React Frontend (Vite)
                  │
         Secure REST API
                  │
          Flask Backend
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
 Facial Recognition       MySQL Database
(OpenCV + face_recognition)
```

---

# 🛠️ Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- Axios
- HTML5
- CSS3

### Backend

- Flask
- Flask-JWT-Extended
- Flask-Mail
- Flask-CORS
- SQLAlchemy
- bcrypt

### Artificial Intelligence

- face_recognition
- OpenCV
- NumPy

### Database

- MySQL

### Security

- JWT
- Email OTP
- Password Hashing
- Environment Variables

---

# 📂 Project Structure

```
Bio-System/

├── backend/
│   ├── app/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── utils/
│   ├── uploads/
│   ├── requirements.txt
│   └── app.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── README.md
├── .gitignore
└── LICENSE
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/biometric-authentication.git

cd biometric-authentication
```

## Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# ⚙️ Environment Variables

Create a `.env` file inside the backend directory.

```env
FLASK_SECRET_KEY=
JWT_SECRET_KEY=

MYSQL_HOST=
MYSQL_PORT=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=

SMTP_SERVER=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
```

---

# 🔒 Security Notice

This repository intentionally excludes:

- Environment Variables
- Secret Keys
- API Keys
- SMTP Credentials
- Database Credentials
- JWT Secrets
- Uploaded Images
- Face Encodings

Sensitive configuration is managed using local `.env` files that are excluded from version control.

# 🎯 Future Improvements

- Face Liveness Detection
- QR Code MFA
- SMS OTP
- WebAuthn / Passkeys
- Refresh Token Rotation
- Docker Deployment
- Audit Logging
- Rate Limiting
- Account Lockout Protection
- Biometric Anti-Spoofing

---

# 👨‍💻 Author

**Kelvin Kaiseyie**

Computer Science Student

Full Stack Developer

Cybersecurity Enthusiast

---

# 📄 License

Licensed under the MIT License.

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a star!

Built with ❤️ using Flask, React, OpenCV and Cybersecurity Best Practices.

</div>
