"""
Service for running AutoGen conversations.
"""
import asyncio
from typing import List
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.messages import TextMessage

from ..schemas.agent import AgentModel
from ..core.config import settings
from ..services.agent_service import AgentService
from ..services.agent_factory import AgentFactory
from ..services.message_handler import MessageHandler
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ConversationRunner:
    """Service for running AutoGen conversations."""
    
    def __init__(self):
        self.agent_factory = AgentFactory()
    
    async def run_conversation(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ):
        """Run a single conversation with the given agents."""
        logger.info(f"[{experiment_id}] Starting conversation runner")
        logger.info(f"[{experiment_id}] Prompt: {prompt[:100]}...")
        logger.info(f"[{experiment_id}] Number of agents: {len(agents)}")
        
        final_sent = False
        try:
            # Add initial system message
            message_handler.add_message(
                agent_name="System",
                content=prompt,
                model="System"
            )
            
            # Create AutoGen agents
            logger.info(f"[{experiment_id}] Creating autogen agents...")
            autogen_agents = await self.agent_factory.create_autogen_agents(agents, message_handler)
            logger.info(f"[{experiment_id}] Created {len(autogen_agents)} autogen agents")
            
            # Handle conversation based on number of agents
            if len(agents) == 1:
                # Single agent: use direct communication
                logger.info(f"[{experiment_id}] Single agent detected, using direct agent.run()")
                single_agent = autogen_agents[0]
                
                # Create initial message
                initial_message = TextMessage(content=prompt, source="user")
                logger.info(f"[{experiment_id}] Running single agent...")
                
                # Run the agent (new API uses keyword argument task=)
                result = await single_agent.run(task=[initial_message])
                logger.info(f"[{experiment_id}] Agent run completed")
                
                # Log the result
                if result and hasattr(result, 'messages'):
                    logger.info(f"[{experiment_id}] Processing {len(result.messages)} result messages")
                    for msg in result.messages:
                        if hasattr(msg, 'content') and msg.content:
                            message_handler.add_message(
                                agent_name=single_agent.name,
                                content=str(msg.content),
                                model=agents[0].model
                            )
                else:
                    logger.warning(f"[{experiment_id}] Agent run returned no messages")
                
                logger.info(f"[{experiment_id}] Single agent conversation completed")
            else:
                # Multiple agents: use group chat (RoundRobinGroupChat)
                logger.info(f"Multiple agents detected ({len(agents)}), using RoundRobinGroupChat")
                
                # Determine max rounds based on settings
                rounds_target = max(settings.default_max_rounds, len(agents) * 6)
                
                # Create team with round-robin selection
                team = RoundRobinGroupChat(
                    participants=autogen_agents,
                    max_rounds=rounds_target,
                )
                
                # Create initial message
                initial_message = TextMessage(content=prompt, source="user")
                
                # Run the team (new API uses keyword argument task=)
                result = await team.run(task=[initial_message])
                
                # Log messages from the result
                if result and hasattr(result, 'messages'):
                    for msg in result.messages:
                        if hasattr(msg, 'content') and msg.content:
                            # Try to find which agent sent this message
                            agent_name = getattr(msg, 'name', 'Agent')
                            model = 'Unknown'
                            for agent in agents:
                                if agent.name == agent_name:
                                    model = agent.model
                                    break
                            
                            message_handler.add_message(
                                agent_name=agent_name,
                                content=str(msg.content),
                                model=model
                            )
                
                logger.info(f"Group chat conversation completed")
            
        except Exception as e:
            logger.error(f"[{experiment_id}] Autogen conversation error: {str(e)}")
            logger.error(f"[{experiment_id}] Error type: {type(e).__name__}")
            import traceback
            logger.error(f"[{experiment_id}] Traceback: {traceback.format_exc()}")
            
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
            except Exception as inner_e:
                logger.error(f"[{experiment_id}] Failed to emit error status: {str(inner_e)}")
            raise
        finally:
            # If we didn't send a final conversation-level message, do nothing; run_experiment will handle finalization
            if final_sent:
                logger.info(f"run_conversation emitted a final status for {experiment_id}")
