"""
End-to-end tests for complete experiment workflows.
"""
import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import patch


@pytest.mark.e2e
class TestExperimentWorkflow:
    """End-to-end tests for complete experiment workflows."""
    
    async def test_complete_experiment_lifecycle(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test complete experiment lifecycle from start to completion."""
        # 1. Start experiment
        start_response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
        assert start_response.status_code == 200
        start_data = start_response.json()
        experiment_id = start_data["experiment_id"]
        
        # Verify initial state
        assert start_data["status"] == "started"
        assert "websocket_url" in start_data
        
        # 2. Get experiment status
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 200
        experiment_data = get_response.json()
        
        # Verify experiment data
        assert experiment_data["experiment_id"] == experiment_id
        assert "title" in experiment_data  # API returns title, not full task object
        assert len(experiment_data["agents"]) == len(sample_experiment_request.agents)
        
        # 3. Verify experiment appears in list
        list_response = await test_client.get("/api/experiments")
        assert list_response.status_code == 200
        experiments_data = list_response.json()
        assert "experiments" in experiments_data
        experiment_ids = [exp["experiment_id"] for exp in experiments_data["experiments"]]
        assert experiment_id in experiment_ids
        
        # 4. Simulate experiment completion (mock autogen service)
        with patch('app.services.autogen_service.autogen_service') as mock_autogen:
            # Mock the autogen service to simulate completion
            mock_autogen.get_experiment_status.return_value = {
                "experiment_id": experiment_id,
                "is_running": False,
                "is_completed": True,
                "message_count": 5,
                "error": None
            }
            
            # Get updated status
            updated_response = await test_client.get(f"/api/experiments/{experiment_id}")
            assert updated_response.status_code == 200
            updated_data = updated_response.json()
            
            # Verify completion status
            assert updated_data["experiment_id"] == experiment_id
        
        # 5. Delete experiment
        delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
        assert delete_response.status_code == 200
        
        # 6. Verify experiment is deleted
        get_after_delete = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_after_delete.status_code == 404
    
    async def test_multiple_experiments_management(self, test_client: AsyncClient, mock_autogen_service_patch):
        """Test managing multiple experiments simultaneously."""
        # Create multiple experiments
        experiments = []
        for i in range(3):
            request = {
                "task": {
                    "id": f"task-{i}",
                    "prompt": f"Test task {i}"
                },
                "agents": [
                    {
                        "id": f"agent-{i}",
                        "name": f"Agent_{i}",  # Autogen requires no whitespace in names
                        "prompt": f"Test prompt {i}",
                        "color": "#FF0000",
                        "model": "llama2"
                    }
                ],
                "iterations": 2
            }
            
            response = await test_client.post("/api/experiments/start", json=request)
            assert response.status_code == 200
            experiments.append(response.json()["experiment_id"])
        
        # Verify all experiments are in the list
        list_response = await test_client.get("/api/experiments")
        assert list_response.status_code == 200
        experiments_data = list_response.json()
        assert "experiments" in experiments_data
        assert len(experiments_data["experiments"]) >= 3
        
        # Verify each experiment can be retrieved individually
        for experiment_id in experiments:
            get_response = await test_client.get(f"/api/experiments/{experiment_id}")
            assert get_response.status_code == 200
            data = get_response.json()
            assert data["experiment_id"] == experiment_id
        
        # Delete all experiments
        for experiment_id in experiments:
            delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
            assert delete_response.status_code == 200
        
        # Verify all experiments are deleted
        for experiment_id in experiments:
            get_response = await test_client.get(f"/api/experiments/{experiment_id}")
            assert get_response.status_code == 404
    
    async def test_experiment_with_different_models(self, test_client: AsyncClient, mock_autogen_service_patch):
        """Test experiment with agents using different models."""
        # Arrange
        request = {
            "task": {
                "id": "multi-model-task",
                "prompt": "Compare different AI models"
            },
            "agents": [
                {
                    "id": "llama-agent",
                    "name": "Llama_Agent",
                    "prompt": "You are a Llama model assistant",
                    "color": "#FF0000",
                    "model": "llama2"
                },
                {
                    "id": "code-agent",
                    "name": "Code_Agent",
                    "prompt": "You are a Code Llama model assistant",
                    "color": "#00FF00",
                    "model": "codellama"
                },
                {
                    "id": "mistral-agent",
                    "name": "Mistral_Agent",
                    "prompt": "You are a Mistral model assistant",
                    "color": "#0000FF",
                    "model": "mistral"
                }
            ],
            "iterations": 3
        }
        
        # Act
        response = await test_client.post("/api/experiments/start", json=request)
        
        # Assert
        assert response.status_code == 200
        experiment_id = response.json()["experiment_id"]
        
        # Verify experiment was created with all agents
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 200
        experiment_data = get_response.json()
        
        assert len(experiment_data["agents"]) == 3
        models = [agent["model"] for agent in experiment_data["agents"]]
        assert "llama2" in models
        assert "codellama" in models
        assert "mistral" in models
        
        # Cleanup
        delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
        assert delete_response.status_code == 200
    
    async def test_experiment_error_recovery(self, test_client: AsyncClient, sample_experiment_request):
        """Test experiment error handling and recovery."""
        # Test with failing autogen service
        with patch('app.api.routes.experiments.autogen_service') as mock_autogen:
            mock_autogen.start_experiment_background.side_effect = Exception("Autogen service error")
            
            # Act
            response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
            
            # Assert
            assert response.status_code == 400  # Bad request when autogen service fails
            data = response.json()
            assert "error" in data  # ExperimentError format
    
    async def test_experiment_concurrent_operations(self, test_client: AsyncClient, mock_autogen_service_patch):
        """Test concurrent operations on experiments."""
        # Create an experiment
        request = {
            "task": {
                "id": "concurrent-task",
                "prompt": "Test concurrent operations"
            },
            "agents": [
                {
                    "id": "concurrent-agent",
                    "name": "Concurrent_Agent",  # Autogen requires no whitespace in names
                    "prompt": "Test prompt",
                    "color": "#FF0000",
                    "model": "llama2"
                }
            ],
            "iterations": 1
        }
        
        start_response = await test_client.post("/api/experiments/start", json=request)
        assert start_response.status_code == 200
        experiment_id = start_response.json()["experiment_id"]
        
        # Perform concurrent operations
        async def get_experiment():
            return await test_client.get(f"/api/experiments/{experiment_id}")
        
        async def get_experiments_list():
            return await test_client.get("/api/experiments")
        
        # Run concurrent operations
        tasks = [get_experiment() for _ in range(5)] + [get_experiments_list() for _ in range(3)]
        results = await asyncio.gather(*tasks)
        
        # Verify all operations succeeded
        for result in results:
            assert result.status_code == 200
        
        # Cleanup
        delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
        assert delete_response.status_code == 200
    
    async def test_experiment_data_persistence(self, test_client: AsyncClient, sample_experiment_request, mock_autogen_service_patch):
        """Test that experiment data persists correctly."""
        # Start experiment
        start_response = await test_client.post("/api/experiments/start", json=sample_experiment_request.model_dump())
        assert start_response.status_code == 200
        experiment_id = start_response.json()["experiment_id"]
        
        # Get experiment data
        get_response = await test_client.get(f"/api/experiments/{experiment_id}")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Verify data integrity
        assert original_data["experiment_id"] == experiment_id
        assert "title" in original_data  # API returns title, not full task object
        assert len(original_data["agents"]) == len(sample_experiment_request.agents)
        
        # Verify agent data
        for i, agent in enumerate(original_data["agents"]):
            original_agent = sample_experiment_request.agents[i]
            assert agent["id"] == original_agent.id
            assert agent["name"] == original_agent.name
            assert agent["prompt"] == original_agent.prompt
            assert agent["color"] == original_agent.color
            assert agent["model"] == original_agent.model
        
        # Cleanup
        delete_response = await test_client.delete(f"/api/experiments/{experiment_id}")
        assert delete_response.status_code == 200

