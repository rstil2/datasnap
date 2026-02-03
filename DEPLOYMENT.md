# DataSnap Production Deployment Guide

> **Note**: For Apple App Store deployment, see [APP_STORE_DEPLOYMENT.md](./APP_STORE_DEPLOYMENT.md)

# DataSnap Production Deployment Guide

## 🚀 Production Deployment Checklist

### Pre-Deployment

- [x] All mock data removed
- [x] Development mode flags disabled
- [x] API endpoints require authentication
- [x] Error handling configured
- [x] Environment variables documented
- [x] Database migrations ready
- [x] Production build tested

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Fill in production values:**
   - Database connection string
   - Secret keys (generate secure random strings)
   - Firebase credentials
   - API keys (OpenAI, Anthropic if using AI features)
   - CORS origins (your production domain)

3. **Backend Setup:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   ```

4. **Frontend Build:**
   ```bash
   cd frontend
   npm install
   npm run build:prod
   ```

### Docker Deployment

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### Manual Deployment

#### Backend
```bash
cd backend
source venv/bin/activate
export $(cat .env.production | xargs)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm run build:prod
# Serve dist/ folder with nginx/apache or deploy to hosting service
```

### Production Configuration

- **API Base URL**: Set `API_BASE_URL` environment variable
- **Database**: PostgreSQL connection string required
- **Authentication**: JWT tokens required for file operations
- **File Storage**: Ensure `/uploads` directory exists and is writable
- **CORS**: Configure allowed origins for production domain

### Security Checklist

- [ ] Secret keys are strong and unique
- [ ] Database passwords are secure
- [ ] CORS origins are restricted to production domain
- [ ] File upload limits are enforced
- [ ] Authentication is required for all file operations
- [ ] Error messages don't expose sensitive information
- [ ] HTTPS is enabled in production
- [ ] Environment variables are not committed to git

### Monitoring

- Error tracking: Configure Sentry DSN if using
- Analytics: Enable via `ENABLE_ANALYTICS=true`
- Performance: Monitor via `ENABLE_PERFORMANCE_MONITORING=true`
- Logs: Check application logs for errors

### Post-Deployment

1. Verify API health: `GET /api/v1/health`
2. Test file upload with authenticated user
3. Verify database connections
4. Check error monitoring integration
5. Test all major features

---

## Version
**DataSnap v2.0.0** - Production Ready

