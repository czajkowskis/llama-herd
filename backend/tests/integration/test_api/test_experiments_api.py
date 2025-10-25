"""
Integration tests for experiments API endpoints.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.integration
class TestExperimentsAPI:
    """Integration tests for experiments API endpoints."""
    
    async def test_start_experiment_success(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test successful experiment start via API."""
        # Act
        response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "experiment_id" in data
        assert "status" in data
        assert "websocket_url" in data
        assert data["status"] == "started"
        assert data["websocket_url"] == f"/ws/experiments/{data['experiment_id']}"
    
    async def test_start_experiment_invalid_request(self, test_client: AsyncClient):
        """Test experiment start with invalid request data."""
        # Arrange
        invalid_request = {
            "task": {
                "id": "test-task",
                "prompt": "Test prompt"
            },
            "agents": [],  # Empty agents list should fail
            "iterations": 1
        }
        
        # Act
        response = await test_client.post("/api/experiments/start", json=invalid_request)
        
        # Assert
        assert response.status_code == 422  # FastAPI returns 422 for validation errors
        data = response.json()
        assert "detail" in data  # FastAPI validation errors use 'detail' field
        assert isinstance(data["detail"], list)
        assert len(data["detail"]) > 0
    
    async def test_start_experiment_missing_fields(self, test_client: AsyncClient):
        """Test experiment start with missing required fields."""
        # Arrange
        incomplete_request = {
            "task": {
                "id": "test-task"
                # Missing prompt
            },
            "agents": [
                {
                    "id": "test-agent",
                    "name": "Test Agent",
                    "prompt": "Test prompt",
                    "color": "#FF0000",
                    "model": "llama2"
                }
            ],
            "iterations": 1
        }
        
        # Act
        response = await test_client.post("/api/experiments/start", json=incomplete_request)
        
        # Assert
        assert response.status_code == 422  # Validation error
    
    async def test_get_experiment_success(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test successful experiment retrieval via API."""
        # Arrange - start an experiment first
        start_response = await test_client.post("/api/experiments/start", json=sample_experiment_request.dict())
        assert start_response.status_code == 200
        experiment_id = start_response.json()["experiment_id"]
        
        # Act
        response = await test_client.get(f"/api/experiments/{experiment_id}")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["experiment_id"] == experiment_id
        assert "title" in data  # API returns title, not full task object
        assert "agents" in data
        assert "status" in data
    
    async def test_get_experiment_not_found(self, test_client: AsyncClient):
        """Test getting non-existent experiment via API."""
        # Arrange
        non_existent_id = "non-existent-id"
        
        # Act
        response = await test_client.get(f"/api/experiments/{non_existent_id}")
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "message" in data
    
    async def test_get_experiments_list(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test getting list of experiments via API."""
        # Arrange - start multiple experiments
        start_response1 = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
        assert start_response1.status_code == 200
        
        # Start second experiment
        second_request = sample_experiment_request.model_copy()
        second_request.task.prompt = "Second test task"
        start_response2 = await test_client.post("/api/experiments/start", json=second_request.model_dump())
        assert start_response2.status_code == 200
        
        # Act
        response = await test_client.get("/api/experiments")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "experiments" in data
        assert isinstance(data["experiments"], list)
        assert len(data["experiments"]) >= 2
        
        # Verify experiment IDs are in the list
        experiment_ids = [exp["experiment_id"] for exp in data["experiments"]]
        assert start_response1.json()["experiment_id"] in experiment_ids
        assert start_response2.json()["experiment_id"] in experiment_ids
    
    async def test_delete_experiment_success(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test successful experiment deletion via API."""
        # Arrange - start an experiment first
        start_response = await test_client.post("/api/experiments/start", json=sample_experiment_request.dict())
        assert start_response.status_code == 200
        experiment_id = start_response.json()["experiment_id"]
        
        # Act
        response = await test_client.delete(f"/api/experiments/{experiment_id}")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify experiment is deleted
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 404
    
    async def test_delete_experiment_not_found(self, test_client: AsyncClient):
        """Test deleting non-existent experiment via API."""
        # Arrange
        non_existent_id = "non-existent-id"
        
        # Act
        response = await test_client.delete(f"/api/experiments/{non_existent_id}")
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "message" in data
    
    async def test_experiment_workflow_complete(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test complete experiment workflow: start -> get -> delete."""
        # 1. Start experiment
        start_response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
        assert start_response.status_code == 200
        experiment_id = start_response.json()["experiment_id"]
        
        # 2. Get experiment
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 200
        experiment_data = get_response.json()
        assert experiment_data["experiment_id"] == experiment_id
        
        # 3. Verify experiment is in list
        list_response = await test_client.get("/api/experiments")
        assert list_response.status_code == 200
        experiments_data = list_response.json()
        assert "experiments" in experiments_data
        experiment_ids = [exp["experiment_id"] for exp in experiments_data["experiments"]]
        assert experiment_id in experiment_ids
        
        # 4. Delete experiment
        delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
        assert delete_response.status_code == 200
        
        # 5. Verify experiment is deleted
        get_after_delete = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_after_delete.status_code == 404
    
    async def test_experiment_with_different_agent_models(self, test_client: AsyncClient, mock_autogen_service_patch):
        """Test experiment with different agent models."""
        # Arrange
        request = {
            "task": {
                "id": "test-task",
                "prompt": "Test prompt with different models"
            },
            "agents": [
                {
                    "id": "agent-1",
                    "name": "Llama Agent",
                    "prompt": "You are a helpful assistant",
                    "color": "#FF0000",
                    "model": "llama2"
                },
                {
                    "id": "agent-2",
                    "name": "Code Agent",
                    "prompt": "You are a coding expert",
                    "color": "#00FF00",
                    "model": "codellama"
                }
            ],
            "iterations": 2
        }
        
        # Act
        response = await test_client.post("/api/experiments/start", json=request)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "experiment_id" in data
        
        # Verify experiment was created
        experiment_id = data["experiment_id"]
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 200
        experiment_data = get_response.json()
        assert len(experiment_data["agents"]) == 2
        assert experiment_data["agents"][0]["model"] == "llama2"
        assert experiment_data["agents"][1]["model"] == "codellama"
    
    async def test_experiment_error_handling(self, test_client: AsyncClient, sample_experiment_request):
        """Test experiment error handling when autogen service fails."""
        # Arrange - mock autogen service to fail
        with patch('app.api.routes.experiments.autogen_service') as mock_autogen:
            mock_autogen.start_experiment_background.side_effect = Exception("Autogen service error")
            
            # Act
            response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
            
            # Assert
            assert response.status_code == 400  # Bad request when autogen service fails
            data = response.json()
            assert "error" in data  # ExperimentError format

