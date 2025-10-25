# Navigation Testing Documentation

This directory contains comprehensive tests for all navigation functionality in the DataSnap frontend application. The testing strategy follows the principle of using only real data (no synthetic data) and provides complete coverage of user navigation flows.

## Directory Structure

```
src/__tests__/navigation/
├── README.md                          # This documentation
├── config.ts                          # Test configuration and constants
├── utils.tsx                          # Shared testing utilities and helpers
├── sidebar-navigation.test.tsx        # Main sidebar navigation tests
├── page-level-navigation.test.tsx     # Page-specific navigation tests
└── accessibility.test.tsx             # Keyboard and accessibility tests
```

## Test Categories

### 1. Main Sidebar Navigation Tests (`sidebar-navigation.test.tsx`)
Tests the core navigation functionality:
- ✅ Renders all 8 navigation items with correct icons and labels
- ✅ Handles click interactions and active state management  
- ✅ Responsive behavior across different viewport sizes
- ✅ Integration with data and user contexts
- ✅ Performance and error handling

### 2. Page-Level Navigation Tests (`page-level-navigation.test.tsx`)
Tests complex navigation within specific pages:
- ✅ Story page: story type switcher, publish/share modals
- ✅ Community page: tab switching, search, tag filtering
- ✅ Shared story viewer: back button, like/comment interactions
- ✅ User menu: dropdown behavior, authentication states
- ✅ Modal focus management and escape key handling

### 3. Accessibility Tests (`accessibility.test.tsx`)
Comprehensive accessibility and keyboard navigation:
- ✅ Tab navigation through all interactive elements
- ✅ Enter/Space key activation support
- ✅ ARIA attributes and semantic HTML structure
- ✅ Screen reader compatibility
- ✅ Focus management in modals and dropdowns
- ✅ Zero critical accessibility violations (via axe-core)

## E2E Tests (Cypress)

Located in `cypress/e2e/`:

### Route-Based Tests (`navigation-routes.cy.ts`)
- ✅ Direct route navigation and deep linking
- ✅ Browser history integration (back/forward)
- ✅ Authentication-based routing
- ✅ Error handling for invalid routes
- ✅ Query parameter and hash navigation

### Error Handling Tests (`navigation-errors.cy.ts`)
- ✅ Network timeout and failure recovery
- ✅ Loading state management
- ✅ Error boundary testing
- ✅ Data corruption recovery
- ✅ Performance under stress

## Testing Principles

### Real Data Only
- ✅ Uses actual seeded community stories from the application
- ✅ OAuth tokens stored securely in session storage
- ✅ Real CSV data structures for testing data-dependent features
- ❌ No synthetic or fake data generation

### Comprehensive Coverage
- **Sidebar Navigation**: 8 navigation items thoroughly tested
- **Page Components**: All major pages and their navigation elements
- **Modals & Overlays**: Focus trapping, keyboard navigation
- **Responsive Design**: Mobile, tablet, and desktop viewports
- **Error States**: Network failures, data corruption, boundary cases

### Accessibility First
- **WCAG 2.1 AA Compliance**: Zero critical violations
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and semantic structure
- **Focus Management**: Correct focus flow and trapping

## Configuration

### Test Data (`config.ts`)
```typescript
// Real story IDs from seeded data
SAMPLE_STORY_IDS: ['sample-1', 'sample-2', 'sample-3', 'sample-4']

// Navigation items match actual application
NAVIGATION_ITEMS: 8 items with correct labels and icons

// Real user data structure
TEST_USER: Matches actual user object schema
```

### Selectors (`config.ts`)
```typescript
// CSS class selectors for existing elements
sidebar: '.sidebar'
navItemActive: '.navItemActive'
userMenu: '[data-testid="user-menu"]'
```

## Running Tests

### Unit/Component Tests
```bash
# Run all navigation tests
npm run test:navigation

# Watch mode for development
npm run test:navigation:watch

# Accessibility tests only  
npm run test:accessibility

# With coverage report
npm run test:coverage
```

### E2E Tests
```bash
# Run all E2E navigation tests
npm run e2e

# Open Cypress UI for debugging
npm run e2e:open

# Run specific test files
npm run cypress:run:navigation
```

### CI/CD Pipeline
```bash
# Triggered automatically on:
# - Push to main/develop branches
# - Pull requests
# - Weekly schedule (Sundays 6 AM UTC)

# Runs in parallel across:
# - Node 18.x and 20.x
# - Chrome, Firefox, Edge browsers  
# - Desktop, tablet, mobile viewports
```

## Coverage Targets

- **Lines**: ≥ 90% for navigation components
- **Functions**: ≥ 90% for navigation logic
- **Branches**: ≥ 85% for conditional navigation paths
- **Statements**: ≥ 90% for navigation code

## Error Reporting

### Automated Notifications
- **Slack**: Immediate notification on test failures
- **GitHub Issues**: Auto-created for critical failures on main branch
- **Coverage Reports**: Deployed to GitHub Pages on every main branch commit

### Manual Monitoring
- **Test Reports**: Available in GitHub Actions artifacts
- **Videos/Screenshots**: Captured for failed Cypress tests
- **Coverage Badge**: Updated in README automatically

## Maintenance

### Weekly Tasks
- Review failed smoke tests (automated on Sundays)
- Check coverage reports and identify gaps
- Update test data if application data structures change

### Monthly Tasks  
- Review and update accessibility standards
- Audit test performance and optimize slow tests
- Update browser compatibility matrix

### Quarterly Tasks
- Full regression test run across all supported browsers
- Review and update test data with real production samples
- Performance benchmark updates

## Troubleshooting

### Common Issues

1. **Tests fail after component changes**
   - Check if CSS selectors have changed
   - Update test selectors in `config.ts`
   - Verify component structure matches test expectations

2. **Accessibility violations**
   - Run `npm run test:accessibility` locally
   - Check axe-core output for specific violations
   - Update components to fix WCAG compliance issues

3. **E2E tests timing out**
   - Increase timeout values in `cypress.config.ts`
   - Check for slow network calls or loading states
   - Verify test data is properly seeded

4. **Coverage below thresholds**
   - Identify uncovered navigation paths
   - Add tests for edge cases and error conditions
   - Review test descriptions to ensure comprehensive coverage

### Debug Commands

```bash
# Debug specific test file
npm run test -- sidebar-navigation.test.tsx --reporter=verbose

# Debug E2E with browser open
npm run cypress:open

# Check accessibility violations
npm run test:accessibility -- --reporter=verbose

# Generate detailed coverage report
npm run test:coverage -- --reporter=html
```

## Contributing

When adding new navigation features:

1. **Add test selectors**: Update `config.ts` with new element selectors
2. **Write unit tests**: Cover the component behavior in isolation
3. **Add E2E tests**: Test the complete user flow end-to-end
4. **Check accessibility**: Ensure keyboard navigation and ARIA compliance
5. **Update documentation**: Add new test cases to this README

### Test Naming Convention
- **Unit tests**: `describe('ComponentName')` → `it('should do specific thing')`
- **E2E tests**: `describe('Feature Area')` → `it('completes user workflow')`
- **Accessibility**: `describe('Keyboard Navigation')` → `it('allows tabbing through elements')`

---

For questions or issues with navigation testing, please create an issue with the `testing` and `navigation` labels.