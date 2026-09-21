# 🐄 DhenuSetu — AI-Based Predictive Mastitis Monitoring System

**DhenuSetu** is an AI-enabled dairy health monitoring and predictive analytics platform designed to support **early forecasting of bovine mastitis** in Indian dairy farms.

The system combines **animal identification, health and milk-quality data, IoT sensor readings, farm-level information, and machine-learning-based risk prediction** to provide actionable insights at both **individual-animal and herd levels**.

---

## 🎯 Project Objective

The objective of DhenuSetu is to help dairy farmers and veterinary professionals:

* Monitor individual animals and herd health
* Collect and manage daily animal and milk-related data
* Integrate IoT sensor readings
* Identify animals at elevated mastitis risk
* Track historical health trends
* Generate reports and insights
* Support early intervention and veterinary decision-making

> **DhenuSetu is intended as a decision-support system and does not replace veterinary diagnosis.**

---

## 🧠 Core System

```text
Animal Identification
        ↓
Animal & Farm Data
        ↓
IoT / Milk Quality Sensors
        ↓
Data Processing & Validation
        ↓
ML-Based Risk Prediction
        ↓
Risk Classification & Alerts
        ↓
Dashboard / Reports
        ↓
Farmer & Veterinary Decision Support
```

---

## ✨ Key Features

### 🐄 Animal Management

* Individual animal profiles
* Animal identification and tagging
* Breed and demographic information
* Health and medical records
* Hardware/sensor pairing
* Daily health and production records

### 🥛 Milk & Health Monitoring

* Daily milk-related measurements
* Milk-quality parameters
* Sensor-based readings
* Historical animal records
* Animal-level trend monitoring

### 🤖 AI/ML Risk Prediction

* Mastitis risk prediction
* Animal-level risk assessment
* Herd-level monitoring
* Historical data-based analysis
* Model-ready feature processing
* Support for adaptive model improvement as additional validated data becomes available

### 🚨 Risk Alerts

* Risk-based alerts
* Animal-specific risk information
* Current-user/connected-animal alert scope
* Historical risk tracking

### 🧪 Veterinary Lab Workflow

The integrated laboratory workflow follows:

```text
Submitted
   ↓
Sample Collected
   ↓
Processing
   ↓
Results Ready
   ↓
Reviewed
   ↓
Closed
```

Closure requires a veterinary/doctor review note.

### 📊 Reports & Analytics

* Daily records
* Animal history
* Monthly aggregation
* Risk trends
* Report generation
* Duplicate prevention by animal/day

### 📡 IoT Integration

* ESP32-based data ingestion
* Sensor/device integration
* Backend ingestion endpoint
* Support for connecting field hardware with the application

### 📱 Offline Support

Firestore persistent web caching is used to support application operation during temporary connectivity loss.

Firestore remains the **source of truth**.

---

# 🏗️ Technology Stack

| Layer              | Technology                        |
| ------------------ | --------------------------------- |
| Frontend           | React + Vite                      |
| Authentication     | Firebase Authentication           |
| Database           | Cloud Firestore                   |
| Notifications      | Firebase Cloud Messaging          |
| Backend            | Node.js + Express                 |
| AI/LLM Integration | Gemini / OpenAI through backend   |
| Media Storage      | Cloudinary                        |
| Email              | Nodemailer / Gmail                |
| IoT                | ESP32                             |
| Offline Data       | Firestore Persistent Cache        |
| Hosting            | Firebase / compatible web hosting |

---

# 📁 Project Structure

```text
DhenuSetu/
│
├── frontend/
│   └── React + Vite application
│
├── backend/
│   └── Node.js + Express API
│
├── firebase/
│   ├── Firestore rules
│   └── Firestore indexes
│
├── hardware/
│   └── ESP32 integration examples
│
├── docs/
│   ├── HOST_FIREBASE.md
│   ├── FIREBASE_SETUP.md
│   ├── EMAIL_SETUP.md
│   └── CLOUDINARY_SETUP.md
│
└── package.json
```

---

# 🔄 Application Data Flow

```text
                ┌──────────────────┐
                │ Animal / Farm    │
                │ Data             │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ IoT / Sensor     │
                │ Data             │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Backend          │
                │ Node + Express   │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Data Processing  │
                │ & Validation     │
                └────────┬─────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌────────────────┐    ┌────────────────┐
     │ Cloud Firestore│    │ ML / AI Layer  │
     └───────┬────────┘    └───────┬────────┘
             │                     │
             └──────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │ Risk Prediction &  │
              │ Analytics          │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ DhenuSetu Dashboard│
              │ & Alerts           │
              └────────────────────┘
```

---

# 🔐 Data Architecture

Application data is **not stored in browser `localStorage`**.

The application uses:

* **Cloud Firestore** as the primary source of truth
* Firestore persistent web cache for offline operation
* Firebase Authentication for user authentication
* Firestore security rules for database access control
* Backend environment variables for sensitive configuration
* Firebase Admin SDK for trusted backend operations

Sensitive credentials and service-account files should **not be committed to GitHub**.

---

# 🚀 Getting Started

## 1. Install dependencies

From the repository root:

```powershell
npm run install:all
```

---

## 2. Configure the backend

Create the environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Create the secrets directory:

```powershell
New-Item -ItemType Directory backend/secrets -Force
```

Place the Firebase Admin SDK service-account file at:

```text
backend/secrets/serviceAccountKey.json
```

Configure the required values in:

```text
backend/.env
```

Depending on the enabled features, this may include:

* Gemini/OpenAI credentials
* Cloudinary credentials
* Gmail/Nodemailer configuration
* IoT/device authentication tokens
* Firebase configuration

---

## 3. Start the backend

Open a terminal at the project root:

```powershell
npm run dev:backend
```

Backend health endpoint:

```text
http://localhost:5000/api/health
```

---

## 4. Start the frontend

Open a second terminal:

```powershell
npm run dev:frontend
```

Open:

```text
http://localhost:5173
```

---

# ⚙️ Configuration

### Frontend Firebase Configuration

```text
frontend/src/config/firebase.config.js
```

### Backend Environment

```text
backend/.env
```

### Firebase Admin Credentials

```text
backend/secrets/serviceAccountKey.json
```

> Never commit `.env` files, service-account credentials, API keys, or other secrets to the repository.

---

# 🔌 IoT Integration

DhenuSetu supports integration with **ESP32-based hardware** for collecting field data.

The general IoT flow is:

```text
Sensors
   ↓
ESP32
   ↓
Authenticated API Request
   ↓
Node.js Backend
   ↓
Data Validation / Processing
   ↓
Cloud Firestore
   ↓
Prediction & Dashboard
```

Hardware integration examples are available in:

```text
hardware/
```

---

# 🗃️ Daily Data & History

Daily animal information is maintained as historical records.

The application:

* Stores daily readings under the animal's Firestore `history`
* Maintains one daily record per animal
* Updates the current animal summary
* Prevents duplicate daily records
* Aggregates daily records for monthly reporting

This allows the system to maintain both **current animal status** and **historical trends**.

---

# 🧪 Veterinary Laboratory Workflow

DhenuSetu provides a sequential workflow for laboratory samples:

```text
Submitted
      ↓
Sample Collected
      ↓
Processing
      ↓
Results Ready
      ↓
Reviewed
      ↓
Closed
```

A case cannot be closed without a documented veterinary review note.

---

# 📈 Reporting

Reports use historical daily records rather than repeatedly storing the same information.

The reporting system supports:

* Animal-level history
* Daily measurements
* Monthly aggregation
* Risk trends
* Health monitoring
* Veterinary review information

Reports are deduplicated using the **animal + date** combination.

---

# 🔒 Security Considerations

The application follows a separation between:

### Client

* User interface
* Firebase Authentication
* Firestore client operations
* Dashboard and visualization

### Backend

* Protected API operations
* AI/LLM requests
* Email operations
* Cloudinary operations
* ESP32 ingestion
* Firebase Admin operations

API keys and service credentials are kept on the backend wherever applicable.

---

# 📚 Documentation

Detailed configuration and deployment instructions are available in:

| Document                   | Purpose                  |
| -------------------------- | ------------------------ |
| `docs/FIREBASE_SETUP.md`   | Firebase configuration   |
| `docs/HOST_FIREBASE.md`    | Production hosting       |
| `docs/EMAIL_SETUP.md`      | Email configuration      |
| `docs/CLOUDINARY_SETUP.md` | Cloudinary configuration |

---

# 🛠️ Development

Recommended development workflow:

```text
Feature / Fix
     ↓
Development
     ↓
Local Testing
     ↓
Data / API Validation
     ↓
Integration Testing
     ↓
Production Deployment
```

---

# 📌 Current Release Notes

* Existing animal editing preserves identity, medical, and hardware-pairing functionality.
* Existing sensor/ESP fields are displayed as read-only.
* Daily readings are entered through **Update today's info**.
* Daily readings are stored under animal history.
* Animal/day duplication is prevented in reporting.
* Monthly reports aggregate daily records.
* Veterinary lab workflow follows the defined sequential states.
* Closing a laboratory case requires a doctor review note.
* Risk-alert counters are scoped to the current user and connected animals.
* Firestore is used as the application data source rather than browser `localStorage`.

---

# 🔮 Future Expansion

The platform can be extended with:

* Additional milk-quality sensors
* Environmental monitoring
* More animal-health parameters
* Expanded herd-level analytics
* Model retraining with validated historical datasets
* Improved farm-level IoT integration
* Advanced veterinary analytics
* Additional animal identification systems
* Regional and multi-farm deployment

---
