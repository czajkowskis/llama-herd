"""
Service for managing AutoGen agent interactions and conversations.
"""
import os
import threading
import time
from typing import List
import autogen
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from openai import OpenAI

from ..schemas.agent import AgentModel
from ..schemas.task import TaskModel
from ..core.config import settings
from ..core.state import state_manager
from ..services.agent_service import AgentService
from ..services.conversation_service import ConversationService
from ..storage import get_storage
from ..utils.logging import logger

storage = get_storage()


class AutogenService:
    """Service for managing AutoGen multi-agent conversations."""
    
    def __init__(self):
        self._setup_environment()
    
class AutogenService:
    """Service for managing AutoGen multi-agent conversations."""
    
    def __init__(self):
        self._setup_environment()
    
    def _setup_environment(self):
        """Set up the environment for AutoGen."""
        # Don't override environment variables - let agent config handle it
        # The agent config already has the correct base_url from settings
        pass
    
    # Custom message handler for logging
    class MessageLogger:
        """Handles message logging for AutoGen agents."""
        
        def __init__(self, message_handler):
            self.message_handler = message_handler
        
        def log_user_message(self, message):
            """Log a user proxy message."""
            if message and not isinstance(message, str):
                message = str(message)
            self.message_handler.add_message(
                agent_name="User",
                content=message,
                model="User"
            )
        
        def log_agent_message(self, agent_name, message, model="Unknown"):
            """Log an agent message."""
            if message and not isinstance(message, str):
                message = str(message)
            self.message_handler.add_message(
                agent_name=agent_name,
                content=message,
                model=model
            )
    
    def create_autogen_agents(
        self,
        agents: List[AgentModel],
        message_handler: 'MessageHandler'
    ) -> List[AssistantAgent]:
        """Create AutoGen agents from agent models."""
        autogen_agents = []
        
        for agent_config in agents:
            # Validate agent configuration
            AgentService.validate_agent_config(agent_config)
            
            # Create agent configuration
            llm_config = AgentService.create_agent_config(agent_config)
            
            # Create standard agent
            agent = self._create_standard_agent(
                agent_config, llm_config, message_handler
            )
            
            autogen_agents.append(agent)
            logger.info(f"Created AutoGen agent: {agent_config.name}")
        
        return autogen_agents
    
    def _create_standard_agent(
        self,
        agent_config: AgentModel,
        llm_config: dict,
        message_handler: 'MessageHandler'
    ) -> AssistantAgent:
        """Create a standard AutoGen agent."""
        
        # Create standard agent
        agent = AssistantAgent(
            name=agent_config.name,
            system_message=agent_config.prompt,
            llm_config=llm_config,
        )
        
        # Set additional properties
        agent.max_consecutive_auto_reply = 1  # Reduced to prevent loops
        agent.can_execute_code = False
        
        # Override the send method to log messages
        original_send = agent.send
        def logged_send(message, recipient, request_reply=None, silent=False):
            if not silent and message:
                # Log the outgoing message
                message_handler.add_message(
                    agent_name=agent_config.name,
                    content=str(message),
                    model=agent_config.model
                )
            return original_send(message, recipient, request_reply, silent)
        
        agent.send = logged_send
        
        return agent
    
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
            autogen_agents = self.create_autogen_agents(agents, message_handler)
            
            # Create user proxy
            user_proxy = self._create_user_proxy(agents[0], message_handler)
            
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
                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(f"Group chat conversation completed with {message_count} messages")
            
        except Exception as e:
            logger.error(f"Autogen conversation error: {str(e)}")
            # Emit an error status for this conversation so listeners are aware
            try:
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
    
    def _create_user_proxy(self, primary_agent: AgentModel, message_handler: 'MessageHandler') -> UserProxyAgent:
        """Create a user proxy agent with logging capabilities."""
        llm_config = AgentService.create_agent_config(primary_agent)
        
        # Create standard UserProxyAgent
        user_proxy = UserProxyAgent(
            name="user_proxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=0,
            llm_config=llm_config,
            code_execution_config=False,
            is_termination_msg=lambda msg: False,
        )
        
        # Override the send method to log messages
        original_send = user_proxy.send
        def logged_send(message, recipient, request_reply=None, silent=False):
            if not silent and message:
                # Log the user proxy message
                message_handler.add_message(
                    agent_name="User",
                    content=str(message),
                    model="User"
                )
            return original_send(message, recipient, request_reply, silent)
        
        user_proxy.send = logged_send
        
        return user_proxy
    
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
    
    def run_experiment(
        self,
        experiment_id: str,
        task: TaskModel,
        agents: List[AgentModel]
    ):
        """Run a complete experiment with multiple iterations."""
        final_sent = False
        try:
            logger.info(f"Starting experiment {experiment_id} with {len(agents)} agents")
            
            experiment = state_manager.get_experiment(experiment_id)
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            logger.info(f"Experiment {experiment_id} found, starting iterations")
            
            iterations = experiment.iterations
            dataset_items = getattr(task, 'datasetItems', None)
            
            logger.info(f"Experiment {experiment_id}: {iterations} iterations, dataset items: {len(dataset_items) if dataset_items else 0}")
            
            # Run iterations
            if dataset_items and isinstance(dataset_items, list) and len(dataset_items) > 0:
                logger.info(f"Running dataset iterations for experiment {experiment_id}")
                self._run_dataset_iterations(experiment_id, dataset_items, agents)
            else:
                logger.info(f"Running manual iterations for experiment {experiment_id}")
                self._run_manual_iterations(experiment_id, task.prompt, agents, iterations)
            
            logger.info(f"Experiment {experiment_id} iterations completed, marking as completed")
            
            # Mark as completed in memory
            state_manager.update_experiment_status(experiment_id, 'completed')
            
            # Persist status change to storage
            from datetime import datetime
            storage.update_experiment(experiment_id, {
                'status': 'completed',
                'completed_at': datetime.now().isoformat()
            })
            logger.info(f"Persisted completion status for experiment {experiment_id}")
            
            self._notify_completion(experiment_id)
            final_sent = True
            
        except Exception as e:
            logger.error(f"Error in experiment {experiment_id}: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Mark as error in memory
            state_manager.update_experiment_status(experiment_id, 'error', error=str(e))
            
            # Persist error status to storage
            from datetime import datetime
            storage.update_experiment(experiment_id, {
                'status': 'error',
                'error': str(e),
                'completed_at': datetime.now().isoformat()
            })
            logger.info(f"Persisted error status for experiment {experiment_id}")
            
            self._notify_error(experiment_id, str(e))
            final_sent = True
        finally:
            # If for some reason we exited without sending a final notification, ensure we persist and notify
            if not final_sent:
                try:
                    logger.warning(f"Final notification not sent for {experiment_id}; sending fallback error status")
                    from datetime import datetime
                    state_manager.update_experiment_status(experiment_id, 'error', error='terminated_without_final')
                    storage.update_experiment(experiment_id, {
                        'status': 'error',
                        'error': 'terminated_without_final',
                        'completed_at': datetime.now().isoformat()
                    })
                    self._notify_error(experiment_id, 'terminated_without_final')
                except Exception as e2:
                    logger.error(f"Failed to send fallback final notification for {experiment_id}: {str(e2)}")
    
    def _run_dataset_iterations(self, experiment_id: str, dataset_items: List, agents: List[AgentModel]):
        """Run experiment over dataset items."""
        for idx, item in enumerate(dataset_items, start=1):
            self._run_single_iteration(experiment_id, item.task, agents, idx)
            self._snapshot_conversation(experiment_id, f"Dataset item {idx}")
    
    def _run_manual_iterations(self, experiment_id: str, prompt: str, agents: List[AgentModel], iterations: int):
        """Run experiment with manual iterations."""
        for iteration in range(1, iterations + 1):
            self._run_single_iteration(experiment_id, prompt, agents, iteration)
            self._snapshot_conversation(experiment_id, f"Run {iteration}")
    
    def _run_single_iteration(self, experiment_id: str, prompt: str, agents: List[AgentModel], iteration: int):
        """Run a single iteration."""
        # Update current iteration
        state_manager.update_experiment_status(experiment_id, 'running', current_iteration=iteration)
        self._notify_status(experiment_id, 'running', iteration)
        
        # Clear messages for new iteration
        experiment = state_manager.get_experiment(experiment_id)
        if experiment:
            experiment.messages = []
        
        # Create message handler and run conversation
        message_handler = MessageHandler(experiment_id)
        # Run conversation in a thread so we can enforce iteration-level timeout
        conv_thread = threading.Thread(
            target=self.run_conversation,
            args=(experiment_id, prompt, agents, message_handler),
            daemon=True
        )
        conv_thread.start()

        # Wait for iteration to complete with configured timeout
        try:
            conv_thread.join(timeout=settings.iteration_timeout_seconds)
            if conv_thread.is_alive():
                # Iteration timed out
                logger.error(f"Iteration {iteration} for {experiment_id} timed out after {settings.iteration_timeout_seconds}s")
                # Mark error and emit final status for this experiment
                state_manager.update_experiment_status(experiment_id, 'error', error='iteration_timeout')
                from datetime import datetime
                storage.update_experiment(experiment_id, {
                    'status': 'error',
                    'error': 'iteration_timeout',
                    'completed_at': datetime.now().isoformat()
                })
                self._notify_error(experiment_id, 'iteration_timeout')
        except Exception as e:
            logger.error(f"Error while waiting for conversation thread: {str(e)}")
            raise
    
    def _snapshot_conversation(self, experiment_id: str, title: str):
        """Create a snapshot of the current conversation."""
        ConversationService.add_conversation_snapshot(experiment_id, title)
    
    def _notify_status(self, experiment_id: str, status: str, iteration: int = None):
        """Notify about status change."""
        try:
            data = {"experiment_id": experiment_id, "status": status}
            if iteration:
                data["current_iteration"] = iteration
            # Non-final status update (running, paused, etc.)
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
    
    def _notify_completion(self, experiment_id: str):
        """Notify about experiment completion."""
        try:
            from datetime import datetime
            data = {
                "experiment_id": experiment_id,
                "status": "completed",
                "final": True,
                "completed_at": datetime.now().isoformat(),
                "close_connection": True
            }
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
    
    def _notify_error(self, experiment_id: str, error: str):
        """Notify about experiment error."""
        try:
            from datetime import datetime
            data = {
                "experiment_id": experiment_id,
                "status": "error",
                "final": True,
                "error": str(error),
                "completed_at": datetime.now().isoformat(),
                "close_connection": True
            }
            # Send as a final status message so clients have a single contract to listen for
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
    
    def start_experiment_background(
        self,
        experiment_id: str,
        task: TaskModel,
        agents: List[AgentModel]
    ) -> None:
        """Start an experiment in a background thread."""
        try:
            logger.info(f"Starting experiment {experiment_id} in background thread")
            thread = threading.Thread(
                target=self.run_experiment,
                args=(experiment_id, task, agents),
                daemon=True
            )
            thread.start()
            logger.info(f"Background thread started for experiment {experiment_id}")

            # Start a watchdog thread to enforce experiment-level timeout
            def _watchdog():
                try:
                    timeout = settings.experiment_timeout_seconds
                    logger.info(f"Watchdog for {experiment_id} will monitor for {timeout}s")
                    thread.join(timeout=timeout)
                    if thread.is_alive():
                        logger.error(f"Experiment {experiment_id} exceeded timeout of {timeout}s; marking as error")
                        state_manager.update_experiment_status(experiment_id, 'error', error='experiment_timeout')
                        from datetime import datetime
                        storage.update_experiment(experiment_id, {
                            'status': 'error',
                            'error': 'experiment_timeout',
                            'completed_at': datetime.now().isoformat()
                        })
                        # Emit final terminal status
                        try:
                            data = {
                                "status": "error",
                                "final": True,
                                "error": 'experiment_timeout',
                                "completed_at": datetime.now().isoformat(),
                                "close_connection": True
                            }
                            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
                        except Exception:
                            pass
                except Exception as e:
                    logger.error(f"Watchdog for {experiment_id} failed: {str(e)}")

            watchdog_thread = threading.Thread(target=_watchdog, daemon=True)
            watchdog_thread.start()
        except Exception as e:
            logger.error(f"Error starting background thread for experiment {experiment_id}: {str(e)}")
            raise


# MessageHandler class (moved from utils for better organization)
class MessageHandler:
    """Handles message creation and storage for experiments."""
    
    def __init__(self, experiment_id: str):
        self.experiment_id = experiment_id
    
    def add_message(self, agent_name: str, content: str, model: str = "Unknown"):
        """Add a message to the experiment."""
        return ConversationService.create_message(
            self.experiment_id, agent_name, content, model
        )


# Global service instance
autogen_service = AutogenService()

