# 🌸 SheCircle

**SheCircle** is a full-stack digital support network designed to help women managing households reduce invisible mental load. Through community support, emotional expression, and structured well-being meetups, it provides a safe, warm space for connection and mutual support.

---

## 🚀 Vision

SheCircle aims to reduce emotional isolation and invisible mental load by combining technology with empathy. It enables women to:
- Join small, trusted **Support Circles**.
- Organize local **Well-being Meetups** (Yoga, Coffee, Walks).
- Share emotional struggles on an **Anonymous Wall**.
- Access **AI-assisted emotional support** for venting and self-care tips.

---

## 🛠 Tech Stack

### Frontend
- **HTML5 / CSS3**: Vanilla implementation with a custom design system.
- **JavaScript**: Pure JS for dynamic UI and REST API integration.
- **FontAwesome**: For friendly, rounded iconography.
- **Google Fonts**: Poppins, Nunito, Inter.

### Backend
- **Python + FastAPI**: High-performance async REST API.
- **WebSockets**: Real-time group chat inside circles.
- **SQLite + SQLAlchemy**: Lightweight relational database.
- **Passlib (Bcrypt)**: Secure password hashing.

---

## 🎨 Design System

SheCircle uses a light, calming, and supportive feminine aesthetic.
- **Primary Rose:** `#F8C8DC`
- **Blush Pink:** `#FADADD`
- **Lavender:** `#E6D9FF`
- **Cream Background:** `#FFF9FB`
- **Peach Accent:** `#FFD6CC`

---

## 📂 Project Structure

```text
SheCircle/
├── backend/
│   ├── main.py              # FastAPI Entry Point
│   ├── database.py          # SQLAlchemy Configuration
│   ├── models.py            # Database Schema
│   ├── auth/                # Security & Password Hashing
│   ├── routers/             # API Endpoints (Auth, Circles, Meetups, AI, etc.)
│   └── venv/                # Virtual Environment
└── frontend/
    ├── index.html           # Main SPA Interface
    ├── css/
    │   └── style.css        # Custom Design System
    └── js/
        └── app.js           # UI & API Integration Logic
```

---

## ⚙️ Installation & Running

### 1. Prerequisites
- Python 3.8+
- Node.js (Not required, as we use vanilla JS)

### 2. Setup Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\Activate.ps1
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy websockets pydantic passlib bcrypt python-multipart
   ```

### 3. Run the Application
1. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
2. Open your browser and navigate to:
   **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

---

## 👩‍💻 Key Features

- **Dashboard**: personalized view of recommendations and upcoming events.
- **Community Circles**: Small, trusted groups for proximity-based support.
- **Meetup Organizer**: Create and RSVP to local activities with map integration.
- **Anonymous Wall**: A safe outlet to share thoughts without judgment.
- **AI Support Bot**: Friendly AI to help navigate stressful moments.

---

## 🔒 Safety & Privacy
SheCircle is designed as a safe space. Location sharing is optional and restricted to circle members, and the anonymous wall ensures users can speak their truth safely.
