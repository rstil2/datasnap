# DataSnap Development Log

## Current State (2025-09-15)

### Architecture
- Desktop application using Electron + React (frontend) and FastAPI (backend)
- Backend runs locally, serves data analysis API
- Frontend connects to backend via HTTP (localhost:8000)

### Components Implemented
1. Backend:
   - CSV file upload and storage
   - Descriptive statistics computation (pandas)
   - API endpoints:
     - `/api/v1/csv/upload` - File upload
     - `/api/v1/csv/files` - List files
     - `/api/v1/stats/{file_id}` - Get descriptive stats

2. Frontend:
   - Dashboard layout with navigation sidebar
   - CSV upload with drag-and-drop
   - File preview after upload
   - Statistics view (in progress)
   - Placeholder pages for:
     - Visualizations
     - Statistical Tests
     - AI Narrative
     - Community Feed

### Current Issues
- Blank white screen in Electron app
- Next steps: Debug frontend rendering using DevTools

### Directory Structure
```
datasnap/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── csv.py
│   │   │       │   └── stats.py
│   │   │       └── api.py
│   │   └── services/
│   │       └── stats_service.py
│   └── main.py
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── DashboardLayout.tsx
    │   │   ├── stats/
    │   │   │   └── StatsPage.tsx
    │   │   └── upload/
    │   │       ├── CSVUpload.tsx
    │   │       └── DataPreview.tsx
    │   ├── services/
    │   │   ├── api.ts
    │   │   └── stats.ts
    │   └── styles/
    │       └── upload.module.css
    ├── electron/
    │   └── main.cjs
    └── vite.config.ts
```

### Development Flow
1. ✅ CSV Upload
   - Upload component
   - File preview
   - Backend storage

2. ✅ Basic Navigation
   - Sidebar with routes
   - Dashboard layout

3. 🔄 Descriptive Statistics (In Progress)
   - Backend computation
   - Frontend display
   - Navigation from upload to stats

4. ⏳ Next Steps
   - Debug blank screen issue
   - Complete statistics view
   - Implement visualizations
   - Add statistical test wizard
   - Implement AI narrative generation
   - Build community features

### Running the App
1. Start backend:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run electron:dev
   ```

### Build Commands
- macOS: `npm run electron:build:mac`
- Windows: `npm run electron:build:win`
- Both: `npm run electron:build`

## Dependencies
- Backend:
  - FastAPI
  - pandas
  - SQLAlchemy
  - uvicorn

- Frontend:
  - React
  - React Router
  - TanStack Query
  - Electron
  - Vite
  - TypeScript
  - Papa Parse (CSV parsing)

## Known Issues
1. Frontend rendering (blank screen)
   - Need to investigate with DevTools
   - Possible routing or rendering issue

2. Missing Features
   - Authentication/Authorization
   - Data persistence
   - Error handling improvements
   - Loading states
   - Form validation

## Future Improvements
1. Data Analysis
   - More statistical tests
   - Interactive visualizations
   - Custom analysis pipelines

2. User Experience
   - Keyboard shortcuts
   - Drag-and-drop improvements
   - Better error messages
   - Loading indicators

3. Performance
   - Large file handling
   - Caching
   - Background processing

4. Security
   - Input validation
   - File type verification
   - Data sanitization