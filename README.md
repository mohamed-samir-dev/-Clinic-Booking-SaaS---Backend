# Clinic Booking SaaS - Backend

## Overview

Multi-tenant clinic booking SaaS backend built with Node.js, Express, and MongoDB.

Supports 4 user roles: **Owner** · **Manager** · **Doctor** · **Patient**, with a branch system (Main Clinic / Branches), appointment booking, reviews, and doctor transfer requests between branches.

## Architecture

```
Backend/
├── server.js
├── package.json
├── .env
└── src/
    ├── config/
    │   └── database.js
    ├── models/
    │   ├── Owner.js
    │   ├── Manager.js
    │   ├── Doctor.js
    │   ├── Patient.js
    │   ├── Business.js
    │   ├── Clinic.js
    │   ├── Appointment.js
    │   ├── Review.js
    │   ├── ContactMessage.js
    │   ├── TransferRequest.js
    │   └── BlockedSlot.js
    ├── controllers/
    │   ├── authController.js
    │   ├── patientAuthController.js
    │   ├── ownerController.js
    │   ├── managerController.js
    │   ├── doctorController.js
    │   ├── patientController.js
    │   ├── patientMedicalController.js
    │   ├── appointmentController.js
    │   ├── reviewController.js
    │   ├── contactController.js
    │   ├── analyticsController.js
    │   └── transferRequestController.js
    ├── middleware/
    │   ├── auth.js
    │   ├── authMiddleware.js
    │   ├── multiTenant.js
    │   └── rbac.js
    └── routes/
        ├── authRoutes.js            # /api/v1/auth
        ├── ownerRoutes.js           # /api/owner
        ├── managerRoutes.js         # /api/manager
        ├── doctorRoutes.js          # /api/doctors
        ├── clinicRoutes.js          # /api/clinics
        ├── appointmentRoutes.js     # /api/appointments
        ├── patientRoutes.js         # /api/patients
        ├── reviewRoutes.js          # /api/reviews
        └── contactRoutes.js         # /api/contact
```

## Features

- **Multi-tenant** — each Business is fully isolated
- **Branch system** — Main Clinic + Branches with inherited settings
- **4 separate auth models** — Owner, Manager, Doctor, Patient
- **Google OAuth** — for patient registration/login
- **Guest booking** — appointments without registration
- **Reviews** — for doctors and clinics with auto-calculated averages
- **Doctor transfers** — transfer requests between branches with doctor approval
- **Blocked slots** — block doctor time slots (surgery, meeting, etc.)
- **Contact messages** — contact form with status management
- **Favorites** — patients can save favorite doctors and clinics
- **Security** — bcrypt, JWT, rate limiting, helmet, CORS, account lockout

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/owner/register` | Register new owner |
| POST | `/owner/login` | Owner login |
| POST | `/manager/login` | Manager login |
| POST | `/doctor/login` | Doctor login |
| POST | `/patient/login` | Patient login |
| POST | `/patient/register` | Patient registration |
| POST | `/patient/google` | Google login |
| POST | `/patient/google-register` | Google registration |
| GET | `/me` | Current user info |
| GET | `/businesses` | List all businesses |
| POST | `/get-business` | Get business by email |

### Owner — `/api/owner` 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get profile |
| PUT | `/profile` | Update profile |
| GET | `/dashboard` | Dashboard data |
| GET | `/stats` | Statistics |
| GET/POST | `/clinics` | List / create clinics |
| GET/PUT | `/clinics/:id` | Get / update clinic |
| GET/POST | `/doctors` | List / create doctors |
| PUT/DELETE | `/doctors/:id` | Update / delete doctor |
| GET/POST | `/managers` | List / create managers |
| GET/PUT/DELETE | `/managers/:id` | Get / update / delete manager |
| GET/PUT | `/main-clinic` | Main clinic settings |
| GET/PUT | `/business` | Business settings |

### Manager — `/api/manager` 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get profile |
| GET | `/dashboard` | Dashboard data |
| GET/POST | `/appointments` | List / create appointments |
| PATCH | `/appointments/:id/confirm` | Confirm appointment |
| PATCH | `/appointments/:id/cancel` | Cancel appointment |
| PATCH | `/appointments/:id/reschedule` | Reschedule appointment |
| PATCH | `/appointments/:id/no-show` | Mark no-show |
| GET/POST | `/doctors` | List / create doctors |
| POST | `/doctors/assign` | Assign doctor to branch |
| GET | `/doctors/specialties` | List specialties |
| GET | `/doctors/available` | Available doctors |
| PATCH | `/doctors/:id/schedule` | Update doctor schedule |
| PATCH | `/doctors/:id/toggle-status` | Toggle doctor status |
| GET | `/doctors/:id/available-dates` | Doctor available dates |
| GET | `/doctors/:id/available-times` | Doctor available times |
| PATCH | `/doctors/:id/deactivate` | Deactivate doctor |
| GET | `/patients` | List patients |
| GET | `/reviews` | List reviews |
| DELETE | `/reviews/:reviewId` | Delete review |
| GET | `/schedules` | List schedules |
| PATCH | `/schedules/:id` | Update schedule |
| GET/POST | `/blocked-slots` | List / create blocked slots |
| DELETE | `/blocked-slots/:id` | Delete blocked slot |
| GET | `/schedule-stats` | Schedule statistics |
| GET/PUT | `/clinic` | Branch clinic settings |
| POST/GET | `/transfer-requests` | Send / list transfer requests |
| POST | `/transfer-requests/reply` | Reply to doctor |

### Doctor — `/api/doctors`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` 🔒 | Get profile |
| PUT | `/profile` 🔒 | Update profile |
| GET | `/transfer-requests` 🔒 | List transfer requests |
| PATCH | `/transfer-requests/:id/respond` 🔒 | Respond to transfer |
| POST | `/transfer-requests/message` 🔒 | Message manager |
| GET | `/top` | Top rated doctors (public) |
| GET | `/all` | All doctors with filters (public) |
| GET | `/filters` | Filter options (public) |
| GET | `/:id` | Doctor details (public) |
| GET | `/:id/availability` | Doctor availability (public) |

### Appointments — `/api/appointments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Book appointment |
| GET | `/check-daily` | Check daily appointment |
| GET | `/blocked-dates` | Get blocked dates |
| GET | `/booked-slots` | Get booked slots |
| GET | `/doctor-stats` 🔒 | Doctor statistics |
| GET | `/doctor/today` 🔒 | Today's appointments |
| GET | `/doctor/pending` 🔒 | Pending requests |
| GET | `/doctor/range` 🔒 | Appointments by date range |
| PATCH | `/:id/status` 🔒 | Update appointment status |
| GET | `/:id` | Appointment details |
| POST | `/link-guest` 🔒 | Link guest appointments |
| GET | `/patient-medical/:patientId` 🔒 | Patient medical info |

### Patient — `/api/patients` 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/profile` | Get / update profile |
| PUT | `/medical-info` | Update medical info |
| PUT | `/change-password` | Change password |
| DELETE | `/account` | Delete account |
| GET | `/appointments` | List appointments |
| PUT | `/appointments/:id/cancel` | Cancel appointment |
| PUT | `/appointments/:id/reschedule` | Reschedule appointment |
| POST | `/appointments/:id/review` | Add review |
| POST/DELETE | `/favorites/:doctorId` | Add / remove favorite doctor |
| GET | `/favorites` | List favorite doctors |
| POST/DELETE | `/favorites/clinics/:clinicId` | Add / remove favorite clinic |
| GET | `/favorites/clinics` | List favorite clinics |

### Reviews — `/api/reviews`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create review |
| GET | `/` | List all reviews |
| GET | `/stats` | Review statistics |
| GET | `/doctor/:doctorId` | Doctor reviews |

### Clinics — `/api/clinics`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all clinics (public) |
| GET | `/:id` | Clinic details |
| GET | `/:id/reviews` | Clinic reviews |
| POST | `/:id/reviews` 🔒 | Add clinic review |

### Contact — `/api/contact`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Send message |
| GET | `/` | List messages |
| GET | `/:id` | Message details |
| PATCH | `/:id/status` | Update status |
| DELETE | `/:id` | Delete message |

> 🔒 = Requires JWT authentication

## Models

| Model | Description |
|-------|-------------|
| **Owner** | Clinic owner — full permissions, linked to Business |
| **Manager** | Branch manager — customizable permissions per branch |
| **Doctor** | Doctor — professional data, schedule, availability, embedded auth |
| **Patient** | Patient — medical data, Google OAuth support, favorites |
| **Business** | Top-level business entity |
| **Clinic** | Clinic (main/branch) — financial settings, working hours, capacity |
| **Appointment** | Appointment — supports registered patients and guests |
| **Review** | Review for doctor or clinic |
| **ContactMessage** | Contact form submission |
| **TransferRequest** | Doctor transfer request between branches |
| **BlockedSlot** | Blocked time slot for a doctor |

## Security

- **bcrypt** (12 rounds) for password hashing
- **JWT** authentication with password change detection
- **Account lockout** after 5 failed attempts (30 min)
- **Rate limiting** — 100 requests / 15 min
- **Helmet** — secure HTTP headers
- **CORS** — controlled origin access
- **Sensitive fields** — passwordHash excluded from responses


## Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcrypt | Password hashing |
| jsonwebtoken | JWT tokens |
| cors | Cross-origin requests |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| express-mongo-sanitize | NoSQL injection prevention |
| morgan | HTTP logging |
| dotenv | Environment variables |
| google-auth-library | Google OAuth |
| date-fns | Date utilities |
| uuid | Unique ID generation |

## License

MIT
