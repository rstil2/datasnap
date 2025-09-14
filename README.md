# DataSnap

DataSnap is a modern, responsive web application for data analysis and visualization. It provides an intuitive interface for uploading and analyzing CSV files, with features for authentication, data visualization, and community interaction.

## Features

- User authentication (email/password and Google OAuth)
- Intuitive dashboard interface
- CSV file upload and processing
- Secure file storage
- Modern, responsive design
- Extensible architecture for future features

## Tech Stack

- Frontend: React with Vite
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Authentication: JWT + Google OAuth
- Styling: CSS Modules

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 16.20.2+
- PostgreSQL

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd datasnap
```

2. Set up the backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:
```bash
cd frontend
npm install
```

4. Create and configure environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Development

1. Start the backend server:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

## Development Status

🚧 Currently under active development

## License

[License Type] - See LICENSE file for details