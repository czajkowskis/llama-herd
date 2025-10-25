# Backend Testing Infrastructure

This directory contains the comprehensive testing infrastructure for the LLaMa-Herd backend.

## Overview

The testing infrastructure is organized into three main layers:

- **Unit Tests** (`unit/`): Test individual functions, classes, and modules in isolation
- **Integration Tests** (`integration/`): Test API endpoints and component interactions
- **End-to-End Tests** (`e2e/`): Test complete workflows and user scenarios

## Directory Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── unit/                    # Unit tests
│   ├── test_services/       # Service layer tests
│   ├── test_storage/        # Storage layer tests
│   ├── test_utils/          # Utility function tests
│   └── test_schemas/        # Schema validation tests
├── integration/             # Integration tests
│   └── test_api/           # API endpoint tests
├── e2e/                     # End-to-end tests
└── mocks/                   # Mock implementations
    ├── mock_ollama.py      # Mock Ollama client
    └── mock_autogen.py     # Mock Autogen service
```

## Running Tests

### Prerequisites

1. Install testing dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Basic Commands

```bash
# Run all tests
pytest

# Run specific test types
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m e2e              # End-to-end tests only

# Run specific test file
pytest tests/unit/test_services/test_experiment_service.py

# Run tests with verbose output
pytest -v

# Run tests in parallel (if pytest-xdist is installed)
pytest -n auto
```


## Test Organization

### Unit Tests

Unit tests focus on testing individual components in isolation:

- **Services** (`test_services/`): Business logic and service layer
- **Storage** (`test_storage/`): Data persistence and file operations
- **Utils** (`test_utils/`): Utility functions and helpers
- **Schemas** (`test_schemas/`): Pydantic model validation

### Integration Tests

Integration tests verify component interactions:

- **API Tests** (`test_api/`): HTTP endpoints and request/response handling
- **WebSocket Tests**: Real-time communication testing
- **Storage Integration**: File system operations with real storage

### End-to-End Tests

E2E tests validate complete user workflows:

- **Experiment Workflows**: Full experiment lifecycle
- **Conversation Workflows**: Import, manage, and export conversations

## Mocking Strategy

### External Services

All external dependencies are mocked for fast, isolated testing:

- **Ollama Client** (`mock_ollama.py`): Simulates model responses and API calls
- **Autogen Service** (`mock_autogen.py`): Simulates multi-agent conversations

### Mock Usage

```python
# In test files
@pytest.fixture
def mock_ollama_client_patch(mock_ollama_client):
    with patch('app.services.ollama_client.ollama_client', mock_ollama_client):
        yield mock_ollama_client
```

## Test Fixtures

### Core Fixtures

- `test_client`: FastAPI test client with mocked dependencies
- `temp_storage`: Temporary storage for isolated testing
- `sample_experiment_request`: Pre-configured experiment data
- `sample_conversation`: Pre-configured conversation data

### Mock Fixtures

- `mock_ollama_client`: Mock Ollama client
- `mock_autogen_service`: Mock Autogen service
- `mock_websocket_connection`: Mock WebSocket for testing

## Writing New Tests

### Test Structure

```python
import pytest
from unittest.mock import patch

@pytest.mark.unit  # or @pytest.mark.integration, @pytest.mark.e2e
class TestYourComponent:
    """Test cases for YourComponent."""
    
    def test_success_case(self, sample_fixture):
        """Test successful operation."""
        # Arrange
        input_data = sample_fixture
        
        # Act
        result = your_function(input_data)
        
        # Assert
        assert result is not None
        assert result.status == "success"
    
    def test_error_case(self):
        """Test error handling."""
        # Arrange
        invalid_input = None
        
        # Act & Assert
        with pytest.raises(ValueError):
            your_function(invalid_input)
```

### Test Markers

Use pytest markers to categorize tests:

```python
@pytest.mark.unit          # Unit tests
@pytest.mark.integration   # Integration tests
@pytest.mark.e2e          # End-to-end tests
@pytest.mark.slow         # Slow-running tests
```

### Async Testing

For async functions, use the `@pytest.mark.asyncio` marker:

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None
```

## Test Data Management

### Using Faker

Generate realistic test data with Faker:

```python
from faker import Faker

fake = Faker()

def test_with_fake_data():
    name = fake.name()
    email = fake.email()
    text = fake.text(max_nb_chars=200)
```

### Test Data Factories

Use the `TestDataFactory` for consistent test data:

```python
def test_with_factory(test_data_factory):
    agent = test_data_factory.create_agent(name="Custom Agent")
    task = test_data_factory.create_task(prompt="Custom prompt")
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to main/master branches
- Pull requests to main/master branches
- Python 3.10 and 3.11

### Test Reports

- Terminal output for quick feedback

## Best Practices

### Test Naming

- Use descriptive test names: `test_experiment_creation_with_valid_data`
- Group related tests in classes: `TestExperimentService`
- Use docstrings to explain test purpose

### Test Isolation

- Each test should be independent
- Use fixtures for setup/teardown
- Mock external dependencies
- Clean up test data

### Assertions

- Use specific assertions: `assert result.status == "success"`
- Test both success and failure cases
- Verify error messages and status codes
- Check data integrity

### Performance

- Keep tests fast (< 1 second per test)
- Use mocks to avoid external calls
- Run slow tests separately with `@pytest.mark.slow`

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure test files are in the correct directory structure
2. **Fixture Not Found**: Check fixture names and imports in `conftest.py`
3. **Mock Not Working**: Verify patch paths match actual import paths
4. **Configuration Issues**: Check `pytest.ini` configuration

### Debug Mode

Run tests with debug output:

```bash
pytest -v -s --tb=long
```

### Test Discovery

Verify test discovery:

```bash
pytest --collect-only
```

## Contributing

When adding new tests:

1. Follow the existing directory structure
2. Use appropriate test markers
3. Include both positive and negative test cases
4. Write comprehensive tests for all functionality
5. Update this documentation if needed

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [Faker Documentation](https://faker.readthedocs.io/)

