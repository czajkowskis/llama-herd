"""
Unit tests for experiment schemas validation.
"""
import pytest
from pydantic import ValidationError as PydanticValidationError
from app.schemas.experiment import ExperimentRequest
from app.schemas.agent import AgentModel
from app.schemas.task import TaskModel


@pytest.mark.unit
class TestExperimentSchemas:
    """Test cases for experiment schema validation."""
    
    def test_experiment_request_requires_agents(self):
        """Test that an experiment requires at least one agent."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        
        with pytest.raises(PydanticValidationError) as exc_info:
            ExperimentRequest(
                task=task,
                agents=[],  # Empty list should fail
                iterations=1
            )
        
        assert "At least one agent is required" in str(exc_info.value)
    
    def test_experiment_request_requires_valid_agent(self):
        """Test that agents must have non-empty fields."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        
        with pytest.raises(PydanticValidationError) as exc_info:
            ExperimentRequest(
                task=task,
                agents=[AgentModel(
                    id="agent-1",
                    name="",  # Empty name should fail
                    prompt="Test prompt",
                    color="#FF0000",
                    model="llama2"
                )],
                iterations=1
            )
        
        assert "Field cannot be empty" in str(exc_info.value)
    
    def test_experiment_request_requires_valid_task(self):
        """Test that task must have non-empty prompt."""
        agent = AgentModel(
            id="agent-1",
            name="Agent 1",
            prompt="Test prompt",
            color="#FF0000",
            model="llama2"
        )
        
        with pytest.raises(PydanticValidationError) as exc_info:
            ExperimentRequest(
                task=TaskModel(
                    id="task-1",
                    prompt=""  # Empty prompt should fail
                ),
                agents=[agent],
                iterations=1
            )
        
        assert "Prompt cannot be empty" in str(exc_info.value)
    
    def test_experiment_request_requires_positive_iterations(self):
        """Test that iterations must be positive."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        agent = AgentModel(
            id="agent-1",
            name="Agent 1",
            prompt="Test prompt",
            color="#FF0000",
            model="llama2"
        )
        
        with pytest.raises(PydanticValidationError) as exc_info:
            ExperimentRequest(
                task=task,
                agents=[agent],
                iterations=0  # Zero or negative should fail
            )
        
        assert "Iterations must be at least 1" in str(exc_info.value)
    
    def test_experiment_request_valid_temperature(self):
        """Test that temperature must be within range."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        
        with pytest.raises(PydanticValidationError) as exc_info:
            ExperimentRequest(
                task=task,
                agents=[AgentModel(
                    id="agent-1",
                    name="Agent 1",
                    prompt="Test prompt",
                    color="#FF0000",
                    model="llama2",
                    temperature=3.0  # Out of range (0-1)
                )],
                iterations=1
            )
        
        assert "Temperature must be between 0 and 1" in str(exc_info.value)
    
    def test_valid_experiment_request(self):
        """Test that a valid experiment request is accepted."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        agent = AgentModel(
            id="agent-1",
            name="Agent 1",
            prompt="Test prompt",
            color="#FF0000",
            model="llama2",
            temperature=0.7
        )
        
        # This should not raise an error
        request = ExperimentRequest(
            task=task,
            agents=[agent],
            iterations=1
        )
        
        assert request.task.prompt == "Test prompt"
        assert len(request.agents) == 1
        assert request.iterations == 1
    
    def test_experiment_request_with_multiple_agents(self):
        """Test experiment request with multiple agents."""
        task = TaskModel(
            id="task-1",
            prompt="Test prompt"
        )
        
        agents = [
            AgentModel(
                id="agent-1",
                name="Agent 1",
                prompt="Test prompt 1",
                color="#FF0000",
                model="llama2"
            ),
            AgentModel(
                id="agent-2",
                name="Agent 2",
                prompt="Test prompt 2",
                color="#00FF00",
                model="codellama"
            )
        ]
        
        request = ExperimentRequest(
            task=task,
            agents=agents,
            iterations=3
        )
        
        assert len(request.agents) == 2
        assert request.agents[0].name == "Agent 1"
        assert request.agents[1].name == "Agent 2"
        assert request.iterations == 3
    
    def test_agent_model_validation(self):
        """Test agent model validation."""
        # Valid agent
        agent = AgentModel(
            id="agent-1",
            name="Test Agent",
            prompt="Test prompt",
            color="#FF0000",
            model="llama2"
        )
        assert agent.name == "Test Agent"
        assert agent.model == "llama2"
        
        # Test with different model
        agent2 = AgentModel(
            id="agent-2",
            name="Code Agent",
            prompt="Code prompt",
            color="#00FF00",
            model="codellama"
        )
        assert agent2.model == "codellama"
    
    def test_task_model_validation(self):
        """Test task model validation."""
        # Valid task
        task = TaskModel(
            id="task-1",
            prompt="Test task prompt"
        )
        assert task.id == "task-1"
        assert task.prompt == "Test task prompt"
        
        # Test with ID (required field)
        task2 = TaskModel(
            id="task-2",
            prompt="Another task prompt"
        )
        assert task2.prompt == "Another task prompt"
    
    def test_experiment_request_edge_cases(self):
        """Test edge cases for experiment request validation."""
        # Minimum valid request
        task = TaskModel(id="min-task", prompt="Minimal task")
        agent = AgentModel(
            id="min-agent",
            name="Min Agent",
            prompt="Min prompt",
            color="#000000",
            model="llama2"
        )
        
        request = ExperimentRequest(
            task=task,
            agents=[agent],
            iterations=1
        )
        
        assert request.iterations == 1
        assert len(request.agents) == 1
        
        # Maximum iterations
        request2 = ExperimentRequest(
            task=task,
            agents=[agent],
            iterations=100
        )
        
        assert request2.iterations == 100

