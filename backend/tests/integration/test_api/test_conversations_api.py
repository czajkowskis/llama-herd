"""
Integration tests for conversations API endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestConversationsAPI:
    """Integration tests for conversations API endpoints."""
    
    async def test_create_conversation_success(self, test_client: AsyncClient, sample_conversation):
        """Test successful conversation creation via API."""
        # Act
        response = await test_client.post("/api/conversations", json=sample_conversation)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Conversation saved"
        assert data["id"] == sample_conversation["id"]
    
    async def test_create_conversation_invalid_data(self, test_client: AsyncClient):
        """Test conversation creation with invalid data."""
        # Arrange
        invalid_conversation = {
            "id": "test-conv",
            # Missing required fields
        }
        
        # Act
        response = await test_client.post("/api/conversations", json=invalid_conversation)
        
        # Assert
        assert response.status_code == 422  # Validation error
    
    async def test_get_conversation_success(self, test_client: AsyncClient, sample_conversation):
        """Test successful conversation retrieval via API."""
        # Arrange - create conversation first
        create_response = await test_client.post("/api/conversations", json=sample_conversation)
        assert create_response.status_code == 200
        
        # Act
        response = await test_client.get(f"/api/conversations/{sample_conversation['id']}")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_conversation["id"]
        assert data["title"] == sample_conversation["title"]
    
    async def test_get_conversation_not_found(self, test_client: AsyncClient):
        """Test getting non-existent conversation via API."""
        # Arrange
        non_existent_id = "non-existent-id"
        
        # Act
        response = await test_client.get(f"/api/conversations/{non_existent_id}")
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "message" in data
    
    async def test_get_conversations_list(self, test_client: AsyncClient, sample_conversation):
        """Test getting list of conversations via API."""
        # Arrange - create multiple conversations
        create_response1 = await test_client.post("/api/conversations", json=sample_conversation)
        assert create_response1.status_code == 200
        
        # Create second conversation
        second_conversation = sample_conversation.copy()
        second_conversation["id"] = "test-conv-2"
        second_conversation["title"] = "Second Test Conversation"
        create_response2 = await test_client.post("/api/conversations", json=second_conversation)
        assert create_response2.status_code == 200
        
        # Act
        response = await test_client.get("/api/conversations")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        assert len(data["conversations"]) >= 2
        
        # Verify conversation IDs are in the list
        conversation_ids = [conv["id"] for conv in data["conversations"]]
        assert sample_conversation["id"] in conversation_ids
        assert "test-conv-2" in conversation_ids
    
    async def test_update_conversation_success(self, test_client: AsyncClient, sample_conversation):
        """Test successful conversation update via API."""
        # Arrange - create conversation first
        create_response = await test_client.post("/api/conversations", json=sample_conversation)
        assert create_response.status_code == 200
        
        # Modify conversation
        updated_conversation = sample_conversation.copy()
        updated_conversation["title"] = "Updated Conversation Title"
        updated_conversation["messages"].append({
            "id": "new-message",
            "role": "assistant",
            "content": "New message content",
            "timestamp": "2023-12-01T12:00:00Z"
        })
        
        # Act
        response = await test_client.put(f"/api/conversations/{sample_conversation['id']}", json=updated_conversation)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Conversation updated"
    
    async def test_update_conversation_not_found(self, test_client: AsyncClient, sample_conversation):
        """Test updating non-existent conversation via API."""
        # Arrange
        non_existent_id = "non-existent-id"
        
        # Act
        response = await test_client.put(f"/api/conversations/{non_existent_id}", json=sample_conversation)
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "message" in data
    
    async def test_delete_conversation_success(self, test_client: AsyncClient, sample_conversation):
        """Test successful conversation deletion via API."""
        # Arrange - create conversation first
        create_response = await test_client.post("/api/conversations", json=sample_conversation)
        assert create_response.status_code == 200
        
        # Act
        response = await test_client.delete(f"/api/conversations/{sample_conversation['id']}")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify conversation is deleted
        get_response = await test_client.get(f"/api/conversations/{sample_conversation['id']}")
        assert get_response.status_code == 404
    
    async def test_delete_conversation_not_found(self, test_client: AsyncClient):
        """Test deleting non-existent conversation via API."""
        # Arrange
        non_existent_id = "non-existent-id"
        
        # Act
        response = await test_client.delete(f"/api/conversations/{non_existent_id}")
        
        # Assert
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "message" in data
    
    async def test_conversation_workflow_complete(self, test_client: AsyncClient, sample_conversation):
        """Test complete conversation workflow: create -> get -> update -> delete."""
        # 1. Create conversation
        create_response = await test_client.post("/api/conversations", json=sample_conversation)
        assert create_response.status_code == 200
        
        # 2. Get conversation
        get_response = await test_client.get(f"/api/conversations/{sample_conversation['id']}")
        assert get_response.status_code == 200
        conversation_data = get_response.json()
        assert conversation_data["id"] == sample_conversation["id"]
        
        # 3. Verify conversation is in list
        list_response = await test_client.get("/api/conversations")
        assert list_response.status_code == 200
        conversations_data = list_response.json()
        conversation_ids = [conv["id"] for conv in conversations_data["conversations"]]
        assert sample_conversation["id"] in conversation_ids
        
        # 4. Update conversation
        updated_conversation = sample_conversation.copy()
        updated_conversation["title"] = "Updated Title"
        update_response = await test_client.put(f"/api/conversations/{sample_conversation['id']}", json=updated_conversation)
        assert update_response.status_code == 200
        
        # 5. Verify update
        get_after_update = await test_client.get(f"/api/conversations/{sample_conversation['id']}")
        assert get_after_update.status_code == 200
        updated_data = get_after_update.json()
        assert updated_data["title"] == "Updated Title"
        
        # 6. Delete conversation
        delete_response = await test_client.delete(f"/api/conversations/{sample_conversation['id']}")
        assert delete_response.status_code == 200
        
        # 7. Verify conversation is deleted
        get_after_delete = await test_client.get(f"/api/conversations/{sample_conversation['id']}")
        assert get_after_delete.status_code == 404
    
    async def test_conversation_with_multiple_agents(self, test_client: AsyncClient):
        """Test conversation with multiple agents."""
        # Arrange
        conversation = {
            "id": "multi-agent-conv",
            "title": "Multi-Agent Conversation",
            "agents": [
                {
                    "id": "agent-1",
                    "name": "Agent_One",  # Autogen requires no whitespace in names
                    "color": "#FF0000",
                    "model": "llama2"
                },
                {
                    "id": "agent-2",
                    "name": "Agent_Two",  # Autogen requires no whitespace in names
                    "color": "#00FF00",
                    "model": "llama2"
                },
                {
                    "id": "agent-3",
                    "name": "Agent_Three",  # Autogen requires no whitespace in names
                    "color": "#0000FF",
                    "model": "llama2"
                }
            ],
            "messages": [
                {
                    "id": "msg-1",
                    "agentId": "agent-1",  # Message schema expects agentId, not role
                    "content": "Hello everyone",
                    "timestamp": "2023-12-01T10:00:00Z"
                },
                {
                    "id": "msg-2",
                    "agentId": "agent-1",  # Message schema expects agentId, not role
                    "content": "Hello from Agent One",
                    "timestamp": "2023-12-01T10:01:00Z"
                },
                {
                    "id": "msg-3",
                    "agentId": "agent-2",  # Message schema expects agentId, not role
                    "content": "Hello from Agent Two",
                    "timestamp": "2023-12-01T10:02:00Z"
                }
            ],
            "createdAt": "2023-12-01T10:00:00Z",
            "importedAt": "2023-12-01T10:00:00Z",
            "source": "import"
        }
        
        # Act
        response = await test_client.post("/api/conversations", json=conversation)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Conversation saved"
        assert data["id"] == "multi-agent-conv"

