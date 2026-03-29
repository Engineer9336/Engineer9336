# Face-Based Attendance Monitoring System - PRD

## Original Problem Statement
Build a complete Face-Based Attendance Monitoring System with face detection (OpenCV Haar Cascade), face recognition (LBPH), webcam capture, JWT admin auth, dashboard with charts, attendance logs with date filter, CSV export, dark/light mode toggle.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + react-webcam + Recharts + Sonner
- **Backend**: FastAPI + MongoDB (Motor) + OpenCV (Haar Cascade + LBPH)
- **Auth**: JWT (httpOnly cookies) + bcrypt password hashing

## User Personas
- **Admin**: Manages users, registers faces, monitors attendance
- **Employees/Students**: Mark attendance via face recognition

## Core Requirements
1. Admin JWT-based authentication
2. User registration with webcam face capture (5+ samples)
3. Face detection (Haar Cascade) + recognition (LBPH)
4. Attendance marking with duplicate prevention (1/day)
5. Dashboard with stats, weekly chart, tabs (Overview, Logs, Users)
6. Attendance logs with date filter + CSV export
7. Dark/light mode toggle
8. Toast notifications (Sonner)

## What's Been Implemented (2026-03-29)
- [x] Full backend: auth, user registration, face processing, attendance marking, dashboard stats, CSV export
- [x] Face detection/recognition pipeline (OpenCV Haar Cascade + LBPH)
- [x] Complete frontend: Login, Dashboard (3 tabs), Register User, Mark Attendance pages
- [x] Responsive sidebar layout with mobile support
- [x] Dark/light mode with localStorage persistence
- [x] Swiss & High-Contrast design (Chivo + IBM Plex Sans fonts)
- [x] All data-testid attributes for testing

## Testing Results
- Backend: 100% (10/10 endpoints)
- Frontend: 95% (all features working, webcam needs real browser)

## Backlog
- P1: Email notification option for attendance (SMTP)
- P2: Multi-admin support with role management
- P2: Real-time video stream for continuous face detection
- P3: Attendance reports with analytics
