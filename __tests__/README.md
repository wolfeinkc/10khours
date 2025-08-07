# Testing Strategy for Practice Tracker App

## Overview
This testing strategy ensures comprehensive coverage of the music practice tracking application with automated tests that run during the build process.

## Test Structure

### 1. Unit Tests (`__tests__/components/`, `__tests__/hooks/`)
- **Component Tests**: Test individual React components in isolation
- **Hook Tests**: Test custom React hooks functionality
- **Coverage**: Aim for 70%+ code coverage on critical components

### 2. Integration Tests (`__tests__/integration/`)
- **Practice Flow**: End-to-end user workflows
- **Data Consistency**: Cross-component data flow
- **Error Handling**: Graceful failure scenarios

### 3. Test Utilities (`__tests__/utils/`)
- **Mock Data**: Consistent test data generators
- **Test Helpers**: Reusable testing utilities
- **Cleanup**: Automatic test data cleanup

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests for CI/CD (runs automatically before build)
npm run test:ci
```

## Test Data Cleanup

All integration tests automatically clean up test data using the `TestDataCleanup` utility:

- Test users are tracked and removed after tests
- Test database entries are cleaned up
- No test data persists between test runs

## Key Testing Features

### 1. **Automated Testing on Build**
- Tests run automatically before `npm run build`
- Build fails if tests don't pass
- Ensures production code quality

### 2. **Mock Supabase Integration**
- Complete Supabase client mocking
- Realistic database responses
- No actual database calls during tests

### 3. **Error Boundary Testing**
- Tests error scenarios
- Verifies graceful error handling
- Ensures app stability

### 4. **Keyboard Shortcuts Testing**
- Tests all keyboard shortcuts
- Verifies accessibility features
- Ensures power user functionality

### 5. **Mobile Responsiveness Testing**
- Tests mobile-optimized components
- Verifies touch interactions
- Ensures cross-device compatibility

## Coverage Requirements

- **Minimum Coverage**: 70% for all metrics
- **Critical Components**: 90%+ coverage required
- **Integration Paths**: All major user flows tested

## Best Practices

1. **Test Isolation**: Each test is independent
2. **Data Cleanup**: No test data leakage
3. **Realistic Mocks**: Mocks behave like real services
4. **Error Testing**: Test both success and failure paths
5. **Accessibility**: Test keyboard navigation and screen readers

## Continuous Integration

Tests are integrated into the build process:
- `prebuild` script runs `test:ci`
- Coverage reports generated
- Build fails on test failures
- Ensures code quality in production
