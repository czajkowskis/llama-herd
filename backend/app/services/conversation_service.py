"""
Service for managing conversations.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from ..schemas.conversation import Message, ConversationAgent, Conversation
from ..core.exceptions import ValidationError
from ..core.state import state_manager
from ..utils.logging import logger


class ConversationService:
    """Service for managing conversations."""

    @staticmethod
    def create_message(
        experiment_id: str, agent_name: str, content: str, model: str = "Unknown"
    ) -> Optional[Message]:
        """Create and add a new message to an experiment."""
        try:
            # Skip user messages - don't create them
            agent_name_lower = agent_name.lower() if agent_name else ""
            model_lower = model.lower() if model else ""
            if agent_name_lower == "user" or model_lower == "user":
                return None

            # Find or create agent
            agent_id = ConversationService._get_or_create_agent_id(
                experiment_id, agent_name, model
            )

            # Create message
            message = Message(
                id=str(uuid.uuid4()),
                agentId=agent_id,
                content=content,
                timestamp=datetime.now().isoformat(),
                model=model,
            )

            # Add to experiment state
            if state_manager.add_message(experiment_id, message):
                # Notify via message queue
                ConversationService._notify_message(experiment_id, message)
                return message
            else:
                raise ValidationError(
                    f"Failed to add message to experiment {experiment_id}"
                )

        except Exception as e:
            logger.error(f"Failed to create message: {str(e)}")
            raise ValidationError(f"Failed to create message: {str(e)}")

    @staticmethod
    def get_experiment_messages(experiment_id: str) -> List[Message]:
        """Get all messages for an experiment."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")

        return experiment.messages

    @staticmethod
    def get_experiment_agents(experiment_id: str) -> List[ConversationAgent]:
        """Get all agents for an experiment."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")

        return experiment.conversation_agents

    @staticmethod
    def add_conversation_snapshot(experiment_id: str, title: str) -> Conversation:
        """Add a conversation snapshot to an experiment."""
        try:
            experiment = state_manager.get_experiment(experiment_id)
            if not experiment:
                raise ValidationError(f"Experiment {experiment_id} not found")

            conversation = Conversation(
                id=str(uuid.uuid4()),
                title=title,
                agents=experiment.conversation_agents,
                messages=experiment.messages,
                createdAt=datetime.now().isoformat(),
            )

            if state_manager.add_conversation(experiment_id, conversation):
                # Also save to persistent storage using new folder structure
                try:
                    from ..storage import get_storage

                    storage = get_storage()
                    # Convert to dict format for storage
                    conversation_dict = conversation.model_dump()

                    # Extract iteration number from title (e.g., "Run 1" -> 1, "Dataset item 3" -> 3)
                    current_iteration = 1  # Default fallback
                    if title.startswith("Run "):
                        try:
                            current_iteration = int(title.split(" ")[1])
                        except (IndexError, ValueError):
                            pass
                    elif title.startswith("Dataset item "):
                        try:
                            current_iteration = int(title.split(" ")[2])
                        except (IndexError, ValueError):
                            pass

                    # Get experiment title for folder naming
                    experiment_title = None
                    if hasattr(experiment, "task") and hasattr(
                        experiment.task, "prompt"
                    ):
                        experiment_title = experiment.task.prompt[:50]  # Limit length

                    # Save conversation using new method (this will create experiment folder if needed)
                    storage.save_experiment_conversation(
                        experiment_id=experiment_id,
                        iteration=current_iteration,
                        title=title,
                        conversation=conversation_dict,
                        experiment_title=experiment_title,
                    )
                    logger.info(
                        f"Saved conversation snapshot {conversation.id} to persistent storage (iteration {current_iteration})"
                    )
                except Exception as storage_error:
                    logger.warning(
                        f"Failed to save conversation to persistent storage: {str(storage_error)}"
                    )

                # Notify via message queue
                ConversationService._notify_conversation(experiment_id, conversation)
                return conversation
            else:
                raise ValidationError(
                    f"Failed to add conversation to experiment {experiment_id}"
                )

        except Exception as e:
            logger.error(f"Failed to add conversation snapshot: {str(e)}")
            raise ValidationError(f"Failed to add conversation snapshot: {str(e)}")

    @staticmethod
    def _get_or_create_agent_id(experiment_id: str, agent_name: str, model: str) -> str:
        """Get existing agent ID or create new agent."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise ValidationError(f"Experiment {experiment_id} not found")

        # Look for existing agent
        for agent in experiment.conversation_agents:
            if agent.name == agent_name:
                return agent.id

        # Create new agent
        agent_id = f"agent-{len(experiment.conversation_agents)}"
        new_agent = ConversationAgent(
            id=agent_id,
            name=agent_name,
            color="#6366F1",  # Default color
            model=model,
        )
        experiment.conversation_agents.append(new_agent)

        return agent_id

    @staticmethod
    def _notify_message(experiment_id: str, message: Message) -> None:
        """Notify about new message via message queue."""
        try:
            state_manager.put_message_threadsafe(
                experiment_id, {"type": "message", "data": message.model_dump()}
            )
        except Exception as e:
            logger.warning(f"Failed to notify about message: {str(e)}")

    @staticmethod
    def _notify_conversation(experiment_id: str, conversation: Conversation) -> None:
        """Notify about new conversation via message queue."""
        try:
            state_manager.put_message_threadsafe(
                experiment_id,
                {"type": "conversation", "data": conversation.model_dump()},
            )
        except Exception as e:
            logger.warning(f"Failed to notify about conversation: {str(e)}")

    @staticmethod
    def notify_conversation_started(experiment_id: str, title: str) -> None:
        """Emit a conversation-start signal before any messages are sent for a new run.
        Sends a 'conversation' payload with a new id and empty messages so the frontend can switch context immediately.
        """
        try:
            experiment = state_manager.get_experiment(experiment_id)
            if not experiment:
                raise ValidationError(f"Experiment {experiment_id} not found")

            # Pre-create System agent if it doesn't exist yet (needed for task message visibility)
            ConversationService._get_or_create_agent_id(
                experiment_id, "System", "System"
            )

            conv = Conversation(
                id=str(uuid.uuid4()),
                title=title,
                agents=experiment.conversation_agents,
                messages=[],
                createdAt=datetime.now().isoformat(),
                experiment_id=experiment_id,
                iteration=experiment.current_iteration or None,
            )
            # Notify only (do not append to experiment.conversations yet)
            ConversationService._notify_conversation(experiment_id, conv)
        except Exception as e:
            logger.warning(f"Failed to emit conversation-start: {str(e)}")

    @staticmethod
    def get_live_conversation(experiment_id: str) -> Optional[dict]:
        """
        Build a live conversation view from an active experiment's current messages.
        Returns None if experiment is not active.
        Returns an empty conversation if experiment exists but has no messages yet.
        """
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            logger.debug(
                f"get_live_conversation: No experiment found in state for {experiment_id}"
            )
            return None

        logger.debug(
            f"get_live_conversation: Building live conversation with {len(experiment.messages)} messages"
        )

        # Build conversation object from current state (even if empty messages)
        # This allows frontend to accumulate messages as they arrive via WebSocket
        return {
            "id": experiment_id,
            "title": "Live",
            "agents": [
                a.model_dump() if hasattr(a, "model_dump") else a
                for a in experiment.conversation_agents
            ],
            "messages": [
                m.model_dump() if hasattr(m, "model_dump") else m
                for m in experiment.messages
            ],
            "createdAt": experiment.created_at,
            "experiment_id": experiment_id,
            "iteration": None,
        }
