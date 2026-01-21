"""
Service for running AutoGen conversations.
"""

import asyncio
from typing import List
from autogen_agentchat.teams import RoundRobinGroupChat, SelectorGroupChat
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.base import TaskResult
from ..schemas.agent import AgentModel
from ..schemas.chat_rules import ChatRulesModel
from ..core.config import settings
from ..services.agent_factory import AgentFactory
from ..services.message_handler import MessageHandler
from ..utils.logging import get_logger


logger = get_logger(__name__)


class ConversationRunner:
    """Service for running AutoGen conversations."""

    def __init__(self):
        self.agent_factory = AgentFactory()

    def _extract_agent_name_from_message(self, msg, agent_name_mapping: dict):
        """Extract agent name from a message using the agent name mapping."""
        agent_name = "Unknown"
        model_name = "Unknown"

        # Get source if available
        if hasattr(msg, "source") and msg.source:
            source = msg.source
            # Try direct key lookup
            if source in agent_name_mapping:
                agent_name = agent_name_mapping[source]
            # Try string representation
            elif str(source) in agent_name_mapping:
                agent_name = agent_name_mapping[str(source)]
            # Try ID representation
            elif str(id(source)) in agent_name_mapping:
                agent_name = agent_name_mapping[str(id(source))]
            # Try to get name from source if it's an agent
            elif hasattr(source, "name"):
                agent_name = source.name
            else:
                # Use string representation as fallback
                agent_name = str(source)

            model_name = agent_name

        return agent_name, model_name

    async def _process_stream_event(
        self, event, message_handler, agent_name_mapping: dict, sent_messages: set
    ):
        """Process a single event from the stream."""
        # Check if this is a TextMessage
        if isinstance(event, TextMessage):
            if hasattr(event, "content") and event.content:
                agent_name, model_name = self._extract_agent_name_from_message(
                    event, agent_name_mapping
                )
                content = str(event.content)

                # Create a unique key for this message to prevent duplicates
                message_key = (agent_name, content)

                # Only send if we haven't sent this message already
                if message_key not in sent_messages:
                    # Send message immediately for real-time display
                    message_handler.add_message(
                        agent_name=agent_name, content=content, model=model_name
                    )
                    sent_messages.add(message_key)
                    logger.debug(
                        f"Sent real-time message from {agent_name}: {content[:50]}..."
                    )
                else:
                    logger.debug(
                        f"Skipped duplicate message from {agent_name}: {content[:50]}..."
                    )

        # Check if this is the final TaskResult
        elif isinstance(event, TaskResult):
            # Process any remaining messages in the result that weren't already sent via streaming
            # This ensures we capture all messages even if some weren't streamed
            self._process_task_result_without_duplicates(
                event, message_handler, agent_name_mapping, sent_messages
            )
            logger.debug("Processed final TaskResult from stream")
            return event

        return None

    def _process_task_result_without_duplicates(
        self,
        result: TaskResult,
        message_handler,
        agent_name_mapping: dict,
        sent_messages: set,
    ):
        """Process TaskResult, skipping messages that were already sent during streaming."""
        # Extract messages from the task result
        messages = result.messages

        for msg in messages:
            # Check if this is a message with content field
            if hasattr(msg, "content") and msg.content:
                # Extract agent name
                agent_name = "Unknown"
                model_name = "Unknown"

                # Get source if available
                if hasattr(msg, "source") and msg.source:
                    source = msg.source
                    # Try to find the agent name in the mapping
                    if source in agent_name_mapping:
                        agent_name = agent_name_mapping[source]
                    elif str(source) in agent_name_mapping:
                        agent_name = agent_name_mapping[str(source)]
                    elif str(id(source)) in agent_name_mapping:
                        agent_name = agent_name_mapping[str(id(source))]
                    elif hasattr(source, "name"):
                        agent_name = source.name
                    else:
                        agent_name = str(source)

                    model_name = agent_name

                # Get content as string
                content = str(msg.content)

                # Create a unique key for this message
                message_key = (agent_name, content)

                # Only process if we haven't sent this message already
                if message_key not in sent_messages:
                    message_handler.add_message(
                        agent_name=agent_name, content=content, model=model_name
                    )
                    sent_messages.add(message_key)
                    logger.debug(
                        f"Processed message from TaskResult: {agent_name}: {content[:50]}..."
                    )
                else:
                    logger.debug(
                        f"Skipped duplicate message from TaskResult: {agent_name}: {content[:50]}..."
                    )

    def run_conversation(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: "MessageHandler",
        chat_rules: ChatRulesModel = None,
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
            loop.run_until_complete(
                self._run_conversation_async(
                    experiment_id, prompt, agents, message_handler, chat_rules
                )
            )
        finally:
            loop.close()

    async def _run_conversation_async(
        self,
        experiment_id: str,
        prompt: str,
        agents: List[AgentModel],
        message_handler: "MessageHandler",
        chat_rules: ChatRulesModel = None,
    ):
        """Run a single conversation asynchronously with the new AutoGen 0.7.5 API."""
        final_sent = False
        try:
            # Create AutoGen agents using new API
            autogen_agents = self.agent_factory.create_autogen_agents(
                agents, message_handler
            )

            # Add initial system message
            message_handler.add_message(
                agent_name="System", content=prompt, model="System"
            )

            # Create agent name mapping for message extraction
            # Map agent objects (by str representation) to their display names
            agent_name_mapping = {}
            for i, agent in enumerate(autogen_agents):
                # Store agent reference and its name
                agent_name_mapping[str(id(agent))] = agents[i].name
                # Also store by the agent object itself (if the message.source is the agent object)
                agent_name_mapping[agent] = agents[i].name

            # Track sent messages to prevent duplicates
            sent_messages = set()

            # Handle conversation based on number of agents
            if len(agents) == 1:
                # Single agent: use direct communication
                logger.info("Single agent detected, using direct communication")
                single_agent = autogen_agents[0]

                # Run the conversation using streaming API for real-time messages
                # Messages will appear one-by-one as they're generated
                result = None
                async for event in single_agent.run_stream(task=prompt):
                    processed_result = await self._process_stream_event(
                        event, message_handler, agent_name_mapping, sent_messages
                    )
                    if processed_result:
                        result = processed_result

                # Get message count from state manager
                from ..core.state import state_manager

                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(
                    f"Single agent conversation completed with {message_count} messages"
                )
            else:
                # Multiple agents: use group chat
                # Determine max_turns from chat_rules or fall back to default
                if chat_rules:
                    max_turns = max(chat_rules.max_rounds, len(agents))
                    logger.info(
                        f"Multiple agents detected ({len(agents)}), using {chat_rules.team_type} with max_turns={max_turns}"
                    )
                else:
                    max_turns = max(settings.default_max_rounds, len(agents))
                    logger.info(
                        f"Multiple agents detected ({len(agents)}), using RoundRobinGroupChat with max_turns={max_turns}"
                    )

                # Select team type based on chat_rules
                if chat_rules and chat_rules.team_type == "selector":
                    # Use first agent's model client for selector (it needs a model to choose speakers)
                    from ..services.agent_service import AgentService

                    model_client = AgentService.create_agent_config(agents[0])

                    # Build SelectorGroupChat parameters
                    selector_params = {
                        "participants": autogen_agents,
                        "model_client": model_client,
                        "max_turns": max_turns,
                    }

                    if chat_rules.allow_repeat_speaker:
                        selector_params["allow_repeated_speaker"] = (
                            chat_rules.allow_repeat_speaker
                        )
                    if chat_rules.termination_condition:
                        selector_params["termination_condition"] = (
                            TextMentionTermination(chat_rules.termination_condition)
                        )

                    # Add custom selector prompt if provided (ignore empty strings)
                    if (
                        chat_rules.selector_prompt
                        and chat_rules.selector_prompt.strip()
                    ):
                        selector_params["selector_prompt"] = chat_rules.selector_prompt

                    group_chat = SelectorGroupChat(**selector_params)
                else:
                    # Default to RoundRobinGroupChat
                    group_chat_params = {
                        "participants": autogen_agents,
                        "max_turns": max_turns,
                    }
                    if chat_rules:
                        if chat_rules.termination_condition:
                            group_chat_params["termination_condition"] = (
                                TextMentionTermination(chat_rules.termination_condition)
                            )

                    group_chat = RoundRobinGroupChat(**group_chat_params)

                # Run the conversation using streaming API for real-time messages
                # max_turns constraint is enforced by AutoGen via the group chat constructor
                # Messages will appear one-by-one as they're generated, respecting max_turns limit
                result = None
                async for event in group_chat.run_stream(task=prompt):
                    processed_result = await self._process_stream_event(
                        event, message_handler, agent_name_mapping, sent_messages
                    )
                    if processed_result:
                        result = processed_result

                # Get message count from state manager
                from ..core.state import state_manager

                experiment = state_manager.get_experiment(experiment_id)
                message_count = len(experiment.messages) if experiment else 0
                logger.info(
                    f"Group chat conversation completed with {message_count} messages"
                )

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
                    "close_connection": False,
                }
                # Using close_connection False here because higher-level run_experiment will decide
                state_manager.put_message_threadsafe(
                    experiment_id, {"type": "status", "data": data}
                )
                final_sent = True
            except Exception:
                pass
            raise
        finally:
            # If we didn't send a final conversation-level message, do nothing; run_experiment will handle finalization
            if final_sent:
                logger.info(
                    f"run_conversation emitted a final status for {experiment_id}"
                )
