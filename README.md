# ARCCO – Aztec Recreational Center Crowd Optimizer

## 📌 Project Overview
ARCCO is a mobile application built using React Native and FastAPI 
that helps SDSU students identify the least crowded times to visit 
the Aztec Recreation Center (ARC).

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm
- Python 3
- Expo Go app (for mobile testing)

### Steps to Run

1. Clone the repository:
   git clone https://github.com/JZaelit/arcco.git

2. Navigate into the project folder:
   cd arcco

3. Install dependencies:
   npm install

4. Start the app:
   npx expo start

5. Press w to open in web browser
   OR scan the QR code with Expo Go on your phone

### Running the Backend

1. Navigate to backend folder:
   cd backend

2. Install Python dependencies:
   pip install -r requirements.txt

3. Start the FastAPI server:
   uvicorn main:app --reload

## 🏗 Architecture Overview

### Mobile App (React Native/Expo)
- Displays real-time ARC crowd data
- Shows occupancy by floor and area
- Recommends best times to visit

### Backend API (FastAPI/Python)
- Processes crowd dataset
- Filters by selected time window
- Returns top 3 least crowded time slots

### Data Layer
- CSV dataset for crowd data

## 🛠 Tech Stack
- React Native (Expo)
- FastAPI (Python 3)
- TypeScript

## ⚠️ Known Issues
- Missing occupancy route warning in console (cosmetic only)
- props.pointerEvents deprecation warning (does not affect functionality)