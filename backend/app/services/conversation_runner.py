"""
Service for running AutoGen conversations.
"""
import asyncio
from typing import List
from autogen_agentchat.teams import RoundRobinGroupChat

from ..schemas.agent import AgentModel
from ..core.config import settings
from ..services.agent_factory import AgentFactory
from ..services.message_handler import MessageHandler
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ConversationRunner:
    """Service for running AutoGen conversations."""
    
    def __init__(self):
        self.agent_factory = AgentFactory()
    
    def run_conversation(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ):
        """
        Run a single conversation with the given agents using the new AutoGen 0.7.5 API.
        
        This method runs the async conversation execution in an event loop.
        """
        # Create a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Run the async conversation
            loop.run_until_complete(self._run_conversation_async(
                experiment_id, prompt, agents, message_handler
            ))
        finally:
            loop.close()
    
    async def _run_conversation_async(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ):
        """Run a single conversation asynchronously with the new AutoGen 0.7.5 API."""
        final_sent = False
        try:
            # Create AutoGen agents using new API
            autogen_agents = self.agent_factory.create_autogen_agents(agents, message_handler)
            
            # Add initial system message
            message_handler.add_message(
                agent_name="System",
                content=prompt,
                model="System"
            )
            
            # Create agent name mapping for message extraction
            # Map agent objects (by str representation) to their display names
            agent_name_mapping = {}
            for i, agent in enumerate(autogen_agents):
                # Store agent reference and its name
                agent_name_mapping[str(id(agent))] = agents[i].name
                # Also store by the agent object itself (if the message.source is the agent object)
                agent_name_mapping[agent] = agents[i].name
            
            # Handle conversation based on number of agents
            if len(agents) == 1:
                # Single agent: use direct communication
                logger.info("Single agent detected, using direct communication")
                single_agent = autogen_agents[0]
                
                # Run the conversation using new async API
                result = await single_agent.run(task=prompt)
                
                # Process the result to extract and log messages
                message_handler.process_task_result(result, agent_name_mapping)
                
                # Get message count from state manager
                from ..core.state import state_manager
                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(f"Single agent conversation completed with {message_count} messages")
            else:
                # Multiple agents: use group chat
                logger.info(f"Multiple agents detected ({len(agents)}), using RoundRobinGroupChat")
                
                # Create RoundRobinGroupChat with max_turns
                max_turns = max(settings.default_max_rounds, len(agents) * 6)
                group_chat = RoundRobinGroupChat(
                    participants=autogen_agents,
                    max_turns=max_turns
                )
                
                # Run the conversation using new async API
                result = await group_chat.run(task=prompt)
                
                # Process the result to extract and log messages
                message_handler.process_task_result(result, agent_name_mapping)
                
                # Get message count from state manager
                from ..core.state import state_manager
                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(f"Group chat conversation completed with {message_count} messages")
            
        except Exception as e:
            logger.error(f"Autogen conversation error: {str(e)}")
            # Emit an error status for this conversation so listeners are aware
            try:
                from ..core.state import state_manager
                from datetime import datetime
                data = {
                    "experiment_id": experiment_id,
                    "status": "error",
                    "final": True,
                    "error": str(e),
                    "completed_at": datetime.now().isoformat(),
                    "close_connection": False
                }
                # Using close_connection False here because higher-level run_experiment will decide
                state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
                final_sent = True
            except Exception:
                pass
            raise
        finally:
            # If we didn't send a final conversation-level message, do nothing; run_experiment will handle finalization
            if final_sent:
                logger.info(f"run_conversation emitted a final status for {experiment_id}")
