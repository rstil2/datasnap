# Development Guidelines

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 16.20.2+
- PostgreSQL 15+
- Docker and Docker Compose (optional)

### Setting up the Development Environment

1. Clone the repository:
```bash
git clone [repository-url]
cd datasnap
```

2. Create and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up the frontend:
```bash
cd frontend
npm install
```

### Running the Application

#### Option 1: Without Docker

1. Start the PostgreSQL database server

2. Start the backend:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

3. Start the frontend:
```bash
cd frontend
npm run dev
```

#### Option 2: With Docker

```bash
# Development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production mode
docker compose up
```

## Development Workflow

### Backend Development

1. Follow FastAPI project structure:
```
backend/
├── app/
│   ├── api/           # API endpoints
│   ├── core/          # Core configuration
│   ├── models/        # Database models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
├── tests/            # Test files
├── alembic/          # Database migrations
└── requirements.txt
```

2. Database migrations:
```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

3. Running tests:
```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Frontend Development

1. Follow React project structure:
```
frontend/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── services/      # API services
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utility functions
│   └── styles/        # CSS files
```

2. Running tests:
```bash
npm test
npm run test:coverage  # With coverage
```

### Code Style Guidelines

#### Python
- Follow PEP 8 style guide
- Use type hints
- Write docstrings for public functions and classes
- Maximum line length: 88 characters (Black formatter)

#### TypeScript/React
- Use functional components with hooks
- Use TypeScript for type safety
- Follow component-per-file pattern
- Use CSS modules for styling

### Git Workflow

1. Create a feature branch:
```bash
git checkout -b feature/feature-name
```

2. Make changes and commit:
```bash
git add .
git commit -m "feat: description"
```

3. Keep commits atomic and follow conventional commit messages:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks

4. Push changes and create a pull request:
```bash
git push origin feature/feature-name
```

### Testing Guidelines

#### Backend Tests
- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Aim for high test coverage
- Use pytest fixtures for setup
- Mock external services

#### Frontend Tests
- Write unit tests for components
- Write integration tests for pages
- Test user interactions
- Mock API calls
- Test error states

### Documentation

- Keep API documentation up to date
- Document all environment variables
- Include setup instructions for new dependencies
- Comment complex business logic
- Update README.md with new features

### Deployment

The application can be deployed using Docker:

1. Build images:
```bash
docker compose build
```

2. Deploy:
```bash
docker compose up -d
```

3. Monitor logs:
```bash
docker compose logs -f
```

### Security Guidelines

- Never commit secrets to version control
- Use environment variables for configuration
- Validate all user input
- Implement proper authentication checks
- Use HTTPS in production
- Keep dependencies updated
- Follow security best practices for file uploads