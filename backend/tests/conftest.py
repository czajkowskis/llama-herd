"""
Shared test fixtures and configuration.
"""
import asyncio
import tempfile
import shutil
import os
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx
from httpx import AsyncClient
from faker import Faker

# Set environment variables for testing before importing app modules
os.environ['DATA_DIRECTORY'] = '/tmp/test_data'
os.environ['OLLAMA_MODELS_DIR'] = '/tmp/test_models'

from app import create_app
from app.core.config import settings
from app.storage import get_storage, UnifiedStorage
from app.schemas.experiment import ExperimentRequest
from app.schemas.agent import AgentModel
from app.schemas.task import TaskModel
from app.core.state import state_manager
from tests.mocks.mock_ollama import MockOllamaClient, MockOllamaClientFactory
from tests.mocks.mock_autogen import MockAutogenService, MockAutogenServiceFactory


# Initialize Faker for test data generation
fake = Faker()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Clean up all test data after test session completes."""
    import os
    import time
    from pathlib import Path
    from app.core.config import settings
    
    # Store original data directory
    original_data_dir = settings.data_directory
    real_data_path = Path(original_data_dir).resolve()
    
    # Get initial file counts for comparison
    initial_experiment_count = 0
    initial_conversation_count = 0
    
    if real_data_path.exists():
        experiments_dir = real_data_path / "experiments"
        conversations_dir = real_data_path / "imported_conversations"
        
        if experiments_dir.exists():
            initial_experiment_count = len(list(experiments_dir.iterdir()))
        if conversations_dir.exists():
            initial_conversation_count = len(list(conversations_dir.iterdir()))
    
    yield
    
    # Clean up any test data that was created during the test session
    if real_data_path.exists():
        experiments_dir = real_data_path / "experiments"
        conversations_dir = real_data_path / "imported_conversations"
        
        # Clean up experiment data
        if experiments_dir.exists():
            current_experiment_count = len(list(experiments_dir.iterdir()))
            if current_experiment_count > initial_experiment_count:
                # Remove the newest experiment directories (likely from tests)
                experiment_dirs = sorted(experiments_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)
                for i, exp_dir in enumerate(experiment_dirs):
                    if i < (current_experiment_count - initial_experiment_count):
                        try:
                            import shutil
                            shutil.rmtree(exp_dir, ignore_errors=True)
                        except Exception:
                            pass  # Ignore cleanup errors
        
        # Clean up conversation data
        if conversations_dir.exists():
            current_conversation_count = len(list(conversations_dir.iterdir()))
            if current_conversation_count > initial_conversation_count:
                # Remove the newest conversation files (likely from tests)
                conversation_files = sorted(conversations_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)
                for i, conv_file in enumerate(conversation_files):
                    if i < (current_conversation_count - initial_conversation_count):
                        try:
                            conv_file.unlink()
                        except Exception:
                            pass  # Ignore cleanup errors
        
        # Clean up any other test-related files
        for pattern in ["test_*", "*test*", "temp_*"]:
            for file_path in real_data_path.rglob(pattern):
                if file_path.is_file() and file_path.name.endswith('.json'):
                    try:
                        file_path.unlink()
                    except Exception:
                        pass  # Ignore cleanup errors


@pytest.fixture
def temp_dir(tmp_path):
    """Create a temporary directory for test storage."""
    temp_dir = tmp_path / "test_data"
    temp_dir.mkdir()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def temp_storage(temp_dir):
    """Create a temporary storage instance for testing."""
    storage = UnifiedStorage(str(temp_dir))
    yield storage
    # Cleanup is handled by temp_dir fixture


def create_test_app(temp_dir: Path):
    """Create a test FastAPI app with temporary data directory."""
    from app.core.config import settings
    
    # Store original settings
    original_data_dir = settings.data_directory
    
    # Override settings for this test
    settings.data_directory = str(temp_dir)
    
    try:
        # Create app with overridden settings
        app = create_app()
        return app
    finally:
        # Restore original settings
        settings.data_directory = original_data_dir


@pytest.fixture
async def test_client(temp_storage, temp_dir):
    """Create a test FastAPI client with mocked dependencies."""
    # Mock the storage to use our temp storage
    with patch('app.storage.get_storage', return_value=temp_storage):
        # Create test app with temporary directory
        app = create_test_app(temp_dir)
        
        async with AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            yield client


@pytest.fixture
def mock_ollama_client():
    """Create a mock Ollama client."""
    return MockOllamaClientFactory.create_successful_client()


@pytest.fixture
def mock_autogen_service():
    """Create a mock Autogen service."""
    return MockAutogenServiceFactory.create_successful_service()


@pytest.fixture
def mock_ollama_client_patch(mock_ollama_client):
    """Patch the Ollama client with a mock."""
    with patch('app.services.ollama_client.ollama_client', mock_ollama_client):
        yield mock_ollama_client


@pytest.fixture
def mock_autogen_service_patch(mock_autogen_service):
    """Patch the Autogen service with a mock."""
    with patch('app.services.autogen_service.autogen_service', mock_autogen_service):
        yield mock_autogen_service


@pytest.fixture
def sample_agent() -> AgentModel:
    """Create a sample agent for testing."""
    return AgentModel(
        id=fake.uuid4(),
        name=fake.user_name().replace(' ', '_'),  # Autogen requires no whitespace in names
        prompt=fake.text(max_nb_chars=200),
        color=fake.hex_color(),
        model="llama2"
    )


@pytest.fixture
def sample_agents(sample_agent) -> List[AgentModel]:
    """Create a list of sample agents for testing."""
    agents = [sample_agent]
    
    # Add a second agent
    agents.append(AgentModel(
        id=fake.uuid4(),
        name=fake.user_name().replace(' ', '_'),  # Autogen requires no whitespace in names
        prompt=fake.text(max_nb_chars=200),
        color=fake.hex_color(),
        model="codellama"
    ))
    
    return agents


@pytest.fixture
def sample_task() -> TaskModel:
    """Create a sample task for testing."""
    return TaskModel(
        id=fake.uuid4(),
        prompt=fake.text(max_nb_chars=300)
    )


@pytest.fixture
def sample_experiment_request(sample_task, sample_agents) -> ExperimentRequest:
    """Create a sample experiment request for testing."""
    return ExperimentRequest(
        task=sample_task,
        agents=sample_agents,
        iterations=3
    )


@pytest.fixture
def sample_conversation() -> Dict[str, Any]:
    """Create a sample conversation for testing."""
    agent_id = fake.uuid4()
    return {
        'id': fake.uuid4(),
        'title': fake.sentence(nb_words=4),
        'agents': [
            {
                'id': agent_id,
                'name': fake.user_name().replace(' ', '_'),  # Autogen requires no whitespace in names
                'color': fake.hex_color(),
                'model': 'llama2'  # Required field for ConversationAgent
            }
        ],
        'messages': [
            {
                'id': fake.uuid4(),
                'agentId': agent_id,  # Message schema expects agentId, not role
                'content': fake.text(max_nb_chars=100),
                'timestamp': fake.iso8601()
            },
            {
                'id': fake.uuid4(),
                'agentId': agent_id,  # Message schema expects agentId, not role
                'content': fake.text(max_nb_chars=150),
                'timestamp': fake.iso8601()
            }
        ],
        'createdAt': fake.iso8601(),
        'source': 'import',  # Required field for Conversation schema
        'importedAt': fake.iso8601()  # Required field for Conversation schema
    }


@pytest.fixture
def sample_experiment() -> Dict[str, Any]:
    """Create a sample experiment for testing."""
    return {
        'id': fake.uuid4(),
        'title': fake.sentence(nb_words=4),
        'status': 'running',
        'created_at': fake.iso8601(),
        'agents': [
            {
                'id': fake.uuid4(),
                'name': fake.name(),
                'prompt': fake.text(max_nb_chars=200),
                'color': fake.hex_color(),
                'model': 'llama2'
            }
        ],
        'task': {
            'id': fake.uuid4(),
            'prompt': fake.text(max_nb_chars=300)
        },
        'iterations': 3,
        'messages': []
    }


@pytest.fixture
def reset_state_manager():
    """Reset the state manager before each test."""
    # Clear any existing experiments
    state_manager.experiment_manager._active_experiments.clear()
    yield
    # Cleanup after test
    state_manager.experiment_manager._active_experiments.clear()


@pytest.fixture(autouse=True)
def ensure_test_isolation(temp_dir):
    """Ensure each test runs in complete isolation with temporary data directory."""
    import os
    from app.core.config import settings
    
    # Store original data directory
    original_data_dir = settings.data_directory
    
    # Set temporary data directory for this test
    settings.data_directory = str(temp_dir)
    
    yield
    
    # Restore original data directory
    settings.data_directory = original_data_dir


@pytest.fixture(autouse=True)
def cleanup_after_each_test():
    """Clean up any test data created during individual tests."""
    from pathlib import Path
    from app.core.config import settings
    
    # Get the real data directory
    real_data_path = Path(settings.data_directory).resolve()
    
    # Store initial state
    initial_experiments = set()
    initial_conversations = set()
    
    if real_data_path.exists():
        experiments_dir = real_data_path / "experiments"
        conversations_dir = real_data_path / "imported_conversations"
        
        if experiments_dir.exists():
            initial_experiments = set(experiments_dir.iterdir())
        if conversations_dir.exists():
            initial_conversations = set(conversations_dir.iterdir())
    
    yield
    
    # Clean up any new files created during this test
    if real_data_path.exists():
        experiments_dir = real_data_path / "experiments"
        conversations_dir = real_data_path / "imported_conversations"
        
        # Clean up new experiment directories
        if experiments_dir.exists():
            current_experiments = set(experiments_dir.iterdir())
            new_experiments = current_experiments - initial_experiments
            for exp_dir in new_experiments:
                try:
                    import shutil
                    shutil.rmtree(exp_dir, ignore_errors=True)
                except Exception:
                    pass  # Ignore cleanup errors
        
        # Clean up new conversation files
        if conversations_dir.exists():
            current_conversations = set(conversations_dir.iterdir())
            new_conversations = current_conversations - initial_conversations
            for conv_file in new_conversations:
                try:
                    conv_file.unlink()
                except Exception:
                    pass  # Ignore cleanup errors


@pytest.fixture(autouse=True)
def cleanup_background_threads():
    """Ensure all background threads are cleaned up after each test."""
    import threading
    import time
    
    # Get initial thread count
    initial_threads = threading.active_count()
    
    yield
    
    # Wait a bit for threads to finish naturally
    time.sleep(0.1)
    
    # Force cleanup of any remaining background threads
    current_threads = threading.active_count()
    if current_threads > initial_threads:
        # Log the extra threads for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Test cleanup: {current_threads - initial_threads} background threads still active")
        
        # Try to stop any remaining background services
        try:
            from app.services.model_pull_manager import pull_manager
            pull_manager.shutdown()
        except Exception:
            pass


@pytest.fixture
def mock_file_operations(mocker):
    """Mock file operations for testing."""
    # Mock file locking
    mocker.patch('filelock.FileLock')
    
    # Mock atomic file operations
    mocker.patch('app.storage.base.BaseStorage.atomic_write_json', return_value=True)
    
    yield


@pytest.fixture
def mock_websocket_connection():
    """Mock WebSocket connection for testing."""
    mock_websocket = AsyncMock()
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()
    mock_websocket.receive_text = AsyncMock()
    mock_websocket.close = AsyncMock()
    return mock_websocket


@pytest.fixture
def mock_progress_callback():
    """Mock progress callback for testing."""
    return AsyncMock()


# Test data factories
class TestDataFactory:
    """Factory for creating test data."""
    
    @staticmethod
    def create_agent(**kwargs) -> AgentModel:
        """Create an agent with optional overrides."""
        defaults = {
            'id': fake.uuid4(),
            'name': fake.user_name().replace(' ', '_'),  # Autogen requires no whitespace in names
            'prompt': fake.text(max_nb_chars=200),
            'color': fake.hex_color(),
            'model': 'llama2'
        }
        defaults.update(kwargs)
        return AgentModel(**defaults)
    
    @staticmethod
    def create_task(**kwargs) -> TaskModel:
        """Create a task with optional overrides."""
        defaults = {
            'id': fake.uuid4(),
            'prompt': fake.text(max_nb_chars=300)
        }
        defaults.update(kwargs)
        return TaskModel(**defaults)
    
    @staticmethod
    def create_experiment_request(**kwargs) -> ExperimentRequest:
        """Create an experiment request with optional overrides."""
        defaults = {
            'task': TestDataFactory.create_task(),
            'agents': [TestDataFactory.create_agent()],
            'iterations': 3
        }
        defaults.update(kwargs)
        return ExperimentRequest(**defaults)
    
    @staticmethod
    def create_conversation(**kwargs) -> Dict[str, Any]:
        """Create a conversation with optional overrides."""
        agent_id = fake.uuid4()
        defaults = {
            'id': fake.uuid4(),
            'title': fake.sentence(nb_words=4),
            'agents': [
                {
                    'id': agent_id,
                    'name': fake.user_name().replace(' ', '_'),  # Autogen requires no whitespace in names
                    'color': fake.hex_color(),
                    'model': 'llama2'  # Required field for ConversationAgent
                }
            ],
            'messages': [
                {
                    'id': fake.uuid4(),
                    'agentId': agent_id,  # Use the same agent ID as above
                    'content': fake.text(max_nb_chars=100),
                    'timestamp': fake.iso8601()
                }
            ],
            'createdAt': fake.iso8601()
        }
        defaults.update(kwargs)
        return defaults


@pytest.fixture
def test_data_factory():
    """Provide access to the test data factory."""
    return TestDataFactory


# Markers for different test types
pytestmark = [
    pytest.mark.asyncio,
]

