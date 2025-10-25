"""
Service for running AutoGen conversations.
"""
import time
from typing import List
import autogen
from autogen import AssistantAgent, GroupChat, GroupChatManager

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
    
    def run_conversation(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ):
        """Run a single conversation with the given agents."""
        final_sent = False
        try:
            # Create AutoGen agents
            autogen_agents = self.agent_factory.create_autogen_agents(agents, message_handler)
            
            # Create user proxy
            user_proxy = self.agent_factory.create_user_proxy(agents[0], message_handler)
            
            # Add initial system message
            message_handler.add_message(
                agent_name="System",
                content=prompt,
                model="System"
            )
            
            # Handle conversation based on number of agents
            if len(agents) == 1:
                # Single agent: use direct communication
                logger.info("Single agent detected, using direct communication")
                single_agent = autogen_agents[0]
                
                # Start conversation with single agent
                user_proxy.initiate_chat(single_agent, message=prompt)
                
                # Wait for conversation to complete
                time.sleep(5)  # Give time for the conversation to develop
                
                # Get message count from state manager
                from ..core.state import state_manager
                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(f"Single agent conversation completed with {message_count} messages")
            else:
                # Multiple agents: use group chat
                logger.info(f"Multiple agents detected ({len(agents)}), using group chat")
                
                # Add user proxy to group chat for initiation
                group_chat_with_proxy = self._create_group_chat(autogen_agents + [user_proxy])
                
                # Create manager with user proxy included
                manager = GroupChatManager(
                    groupchat=group_chat_with_proxy,
                    llm_config=AgentService.create_agent_config(agents[0])
                )
                
                # Initiate chat with the group
                user_proxy.initiate_chat(
                    manager,
                    message=prompt
                )
                
                # Wait for conversation to complete
                time.sleep(5)  # Give time for the conversation to develop
                
                # Get message count from state manager
                from ..core.state import state_manager
                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(f"Group chat conversation completed with {message_count} messages")
            
        except Exception as e:
            logger.error(f"Autogen conversation error: {str(e)}")
            # Emit an error status for this conversation so listeners are aware
            try:
                from ..services.experiment_notifier import ExperimentNotifier
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
    
    def _create_group_chat(self, agents: List[AssistantAgent]) -> GroupChat:
        """Create a group chat configuration."""
        rounds_target = max(settings.default_max_rounds, len(agents) * 6)
        
        return GroupChat(
            agents=agents,
            messages=[],
            max_round=rounds_target,
            speaker_selection_method="round_robin",
            allow_repeat_speaker=False,
            send_introductions=False,
        )
