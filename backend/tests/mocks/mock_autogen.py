"""
Mock implementation of Autogen service for testing.
"""
import asyncio
import uuid
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock


class MockAutogenAgent:
    """Mock Autogen agent for testing."""
    
    def __init__(self, name: str, system_message: str, model: str = "llama2"):
        self.name = name
        self.system_message = system_message
        self.model = model
        self.messages = []
        self.conversation_id = None
    
    async def generate_reply(self, messages: List[Dict[str, Any]], **kwargs) -> str:
        """Mock message generation."""
        # Simulate processing time
        await asyncio.sleep(0.01)
        
        # Generate a mock response based on the last message
        last_message = messages[-1]["content"] if messages else "Hello"
        response = f"[{self.name}] Mock response to: {last_message[:30]}..."
        
        # Store the message
        self.messages.append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
        
        return response


class MockAutogenGroupChat:
    """Mock Autogen group chat for testing."""
    
    def __init__(self, agents: List[MockAutogenAgent], messages: List[Dict[str, Any]] = None):
        self.agents = agents
        self.messages = messages or []
        self.max_round = 10
        self.conversation_id = str(uuid.uuid4())
        self.is_running = False
        self.is_completed = False
        self.error = None
    
    async def start(self, message: str, **kwargs) -> None:
        """Mock starting a group chat."""
        self.is_running = True
        self.is_completed = False
        self.error = None
        
        # Add initial message
        self.messages.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Simulate conversation rounds
        await self._simulate_conversation(message)
    
    async def _simulate_conversation(self, initial_message: str) -> None:
        """Simulate a multi-agent conversation."""
        current_message = initial_message
        round_count = 0
        
        while round_count < self.max_round and not self.is_completed:
            round_count += 1
            
            # Each agent responds
            for agent in self.agents:
                if not self.is_running:  # Check if stopped
                    return
                
                # Generate response
                response = await agent.generate_reply([{"content": current_message}])
                
                # Add to messages
                self.messages.append({
                    "role": "assistant",
                    "content": response,
                    "agent": agent.name,
                    "timestamp": datetime.now().isoformat()
                })
                
                current_message = response
                
                # Small delay to simulate real conversation
                await asyncio.sleep(0.01)
            
            # Check for completion (mock logic: complete after 3 rounds)
            if round_count >= 3:
                self.is_completed = True
                break
        
        self.is_running = False
    
    def stop(self) -> None:
        """Mock stopping the group chat."""
        self.is_running = False
    
    def get_messages(self) -> List[Dict[str, Any]]:
        """Get all messages from the conversation."""
        return self.messages.copy()
    
    def set_error(self, error: Exception) -> None:
        """Set an error state for testing."""
        self.error = error
        self.is_running = False
        self.is_completed = False


class MockAutogenService:
    """Mock Autogen service for testing."""
    
    def __init__(self):
        self.active_experiments = {}
        self.agents = {}
        self.conversations = {}
        self.callbacks = {}
    
    async def start_experiment_background(
        self, 
        experiment_id: str, 
        task: Any, 
        agents: List[Any],
        progress_callback: Optional[Callable] = None
    ) -> None:
        """Mock starting an experiment in the background."""
        self.callbacks[experiment_id] = progress_callback
        
        # Create mock agents
        mock_agents = []
        for agent_data in agents:
            mock_agent = MockAutogenAgent(
                name=agent_data.name,
                system_message=agent_data.prompt,
                model=agent_data.model
            )
            mock_agents.append(mock_agent)
        
        # Create mock group chat
        group_chat = MockAutogenGroupChat(mock_agents)
        self.active_experiments[experiment_id] = group_chat
        self.conversations[experiment_id] = group_chat
        
        # Start the conversation
        await group_chat.start(task.prompt)
        
        # Notify completion if callback exists
        if progress_callback:
            await progress_callback({
                "type": "experiment_completed",
                "experiment_id": experiment_id,
                "messages": group_chat.get_messages()
            })
    
    async def stop_experiment(self, experiment_id: str) -> bool:
        """Mock stopping an experiment."""
        if experiment_id in self.active_experiments:
            self.active_experiments[experiment_id].stop()
            return True
        return False
    
    def get_experiment_status(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Mock getting experiment status."""
        if experiment_id not in self.conversations:
            return None
        
        conversation = self.conversations[experiment_id]
        return {
            "experiment_id": experiment_id,
            "is_running": conversation.is_running,
            "is_completed": conversation.is_completed,
            "message_count": len(conversation.messages),
            "error": str(conversation.error) if conversation.error else None
        }
    
    def get_experiment_messages(self, experiment_id: str) -> List[Dict[str, Any]]:
        """Mock getting experiment messages."""
        if experiment_id not in self.conversations:
            return []
        
        return self.conversations[experiment_id].get_messages()
    
    def set_experiment_error(self, experiment_id: str, error: Exception) -> None:
        """Set an error for a specific experiment (for testing)."""
        if experiment_id in self.conversations:
            self.conversations[experiment_id].set_error(error)
    
    def clear_experiments(self) -> None:
        """Clear all experiments (for test cleanup)."""
        self.active_experiments.clear()
        self.conversations.clear()
        self.callbacks.clear()


class MockAutogenServiceFactory:
    """Factory for creating mock Autogen services with different configurations."""
    
    @staticmethod
    def create_successful_service() -> MockAutogenService:
        """Create a mock service that always succeeds."""
        return MockAutogenService()
    
    @staticmethod
    def create_failing_service() -> MockAutogenService:
        """Create a mock service that always fails."""
        service = MockAutogenService()
        
        # Override start_experiment_background to always fail
        async def failing_start(*args, **kwargs):
            raise Exception("Mock Autogen service failure")
        
        service.start_experiment_background = failing_start
        return service
    
    @staticmethod
    def create_slow_service(delay: float = 2.0) -> MockAutogenService:
        """Create a mock service with configurable delays."""
        service = MockAutogenService()
        service.delay = delay
        return service

