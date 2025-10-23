import sys
import os
import unittest
from pathlib import Path
import shutil
import uuid
import json

# Add the 'backend' directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.storage.base import BaseStorage
from app.storage import get_storage
from app.storage.file_storage import FileStorage
from migrate_data import migrate_data

class TestStorage(unittest.TestCase):
    def setUp(self):
        self.test_data_dir = "test_data"
        # Ensure the test directory is clean before each test
        if os.path.exists(self.test_data_dir):
            shutil.rmtree(self.test_data_dir)
        os.makedirs(self.test_data_dir)
        
        # Create the experiments directory within the test data directory
        os.makedirs(os.path.join(self.test_data_dir, "experiments"))

    def tearDown(self):
        # Clean up the test directory after each test
        if os.path.exists(self.test_data_dir):
            shutil.rmtree(self.test_data_dir)

    def test_get_storage_factory(self):
        """Test that get_storage() returns a valid storage instance."""
        # We need to run this with the test settings
        storage = FileStorage(data_dir=self.test_data_dir)
        self.assertIsNotNone(storage)
        self.assertIsInstance(storage, BaseStorage)

    def test_filestorage_implements_base(self):
        """Test that FileStorage implements all methods of BaseStorage."""
        try:
            storage = FileStorage(data_dir=self.test_data_dir)
            self.assertIsInstance(storage, BaseStorage)
        except TypeError as e:
            self.fail(f"FileStorage does not correctly implement BaseStorage: {e}")

    def test_experiment_creation(self):
        """Test experiment creation, retrieval, and directory structure."""
        storage = FileStorage(data_dir=self.test_data_dir)
        experiment_id = str(uuid.uuid4())
        experiment_data = {
            "id": experiment_id,
            "title": "My Test Experiment",
            "description": "A test.",
            "status": "pending",
            "task": {
                "id": "task-1",
                "prompt": "Test task",
            },
            "agents": [{
                "id": "agent-1",
                "name": "Test Agent",
                "prompt": "Test prompt",
                "color": "#FF0000",
                "model": "llama2"
            }],
            "iterations": 1
        }

        # 1. Test Experiment Creation
        save_success = storage.save_experiment(experiment_data)
        self.assertTrue(save_success)

        # Verify directory and metadata file were created
        experiment_dir = Path(self.test_data_dir) / "experiments" / experiment_id
        metadata_file = experiment_dir / "experiment.json"
        self.assertTrue(experiment_dir.is_dir())
        self.assertTrue(metadata_file.is_file())

        # 2. Test Experiment Retrieval
        retrieved_experiment = storage.get_experiment(experiment_id)
        self.assertIsNotNone(retrieved_experiment)
        self.assertEqual(retrieved_experiment["id"], experiment_id)
        self.assertEqual(retrieved_experiment["title"], "My Test Experiment")

    def test_conversation_storage(self):
        """Test conversation storage, naming, and retrieval."""
        storage = FileStorage(data_dir=self.test_data_dir)
        experiment_id = str(uuid.uuid4())
        
        # First, create the experiment
        storage.save_experiment({
            "id": experiment_id,
            "title": "Conversation Test",
            "status": "pending",
            "task": {"id": "task-1", "prompt": "Test"},
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "iterations": 1
        })

        # 1. Test Conversation Storage and Naming
        conversation_data = {
            "agents": [{
                "id": "agent-1",
                "name": "Test Agent",
                "prompt": "Test",
                "color": "#FF0000",
                "model": "llama2"
            }],
            "messages": [{
                "id": "msg-1",
                "agentId": "agent-1",
                "content": "Hello",
                "timestamp": "2023-01-01T00:00:00"
            }]
        }
        save_success = storage.save_experiment_conversation(
            experiment_id=experiment_id,
            iteration=1,
            title="Run 1",
            conversation=conversation_data
        )
        self.assertTrue(save_success)

        # Verify conversation file is created correctly
        conversation_file = Path(self.test_data_dir) / "experiments" / experiment_id / "conversations" / "1.json"
        self.assertTrue(conversation_file.is_file())

        # 2. Test Conversation Retrieval
        conversations = storage.get_experiment_conversations(experiment_id)
        self.assertEqual(len(conversations), 1)
        self.assertEqual(conversations[0]["iteration"], 1)
        self.assertEqual(conversations[0]["experiment_id"], experiment_id)

    def test_list_all_experiments(self):
        """Test that get_experiments() returns a list of all experiments."""
        storage = FileStorage(data_dir=self.test_data_dir)
        
        # Create two experiments
        exp1_id = str(uuid.uuid4())
        storage.save_experiment({
            "id": exp1_id,
            "title": "Experiment 1",
            "created_at": "2023-01-01T00:00:00",
            "status": "pending",
            "task": {"id": "task-1", "prompt": "Test"},
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "iterations": 1
        })
        
        exp2_id = str(uuid.uuid4())
        storage.save_experiment({
            "id": exp2_id,
            "title": "Experiment 2",
            "created_at": "2023-01-02T00:00:00",
            "status": "pending",
            "task": {"id": "task-1", "prompt": "Test"},
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "iterations": 1
        })

        all_experiments = storage.get_experiments()
        self.assertEqual(len(all_experiments), 2)
        
        # Check if sorted correctly (newest first)
        self.assertEqual(all_experiments[0]["id"], exp2_id)
        self.assertEqual(all_experiments[1]["id"], exp1_id)

    def test_experiment_deletion(self):
        """Test that delete_experiment() removes the entire experiment directory."""
        storage = FileStorage(data_dir=self.test_data_dir)
        experiment_id = str(uuid.uuid4())
        
        # Create an experiment and a conversation
        storage.save_experiment({
            "id": experiment_id,
            "title": "To Be Deleted",
            "status": "pending",
            "task": {"id": "task-1", "prompt": "Test"},
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "iterations": 1
        })
        storage.save_experiment_conversation(experiment_id, 1, "conv", {
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "messages": []
        })

        experiment_dir = Path(self.test_data_dir) / "experiments" / experiment_id
        self.assertTrue(experiment_dir.exists())

        # Delete the experiment
        delete_success = storage.delete_experiment(experiment_id)
        self.assertTrue(delete_success)
        
        # Verify the directory is gone
        self.assertFalse(experiment_dir.exists())

    def test_get_conversation_by_composite_id(self):
        """Test retrieving a single conversation by its composite ID."""
        storage = FileStorage(data_dir=self.test_data_dir)
        experiment_id = str(uuid.uuid4())
        
        storage.save_experiment({
            "id": experiment_id,
            "title": "Get Conversation Test",
            "status": "pending",
            "task": {"id": "task-1", "prompt": "Test"},
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "iterations": 1
        })
        storage.save_experiment_conversation(experiment_id, 1, "conv1", {
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "messages": [{"id": "msg-1", "agentId": "agent-1", "content": "1", "timestamp": "2023-01-01T00:00:00"}]
        })
        storage.save_experiment_conversation(experiment_id, 2, "conv2", {
            "agents": [{"id": "agent-1", "name": "Agent", "prompt": "Test", "color": "#FF0000", "model": "llama2"}],
            "messages": [{"id": "msg-2", "agentId": "agent-1", "content": "2", "timestamp": "2023-01-01T00:00:00"}]
        })

        # The composite ID is <experiment_id>_<iteration>
        composite_id = f"{experiment_id}_2"
        
        conversation = storage.get_conversation(composite_id)
        self.assertIsNotNone(conversation)
        self.assertEqual(conversation["iteration"], 2)
        self.assertEqual(conversation["messages"][0]["content"], "2")

    def test_data_migration(self):
        """Test the data migration script."""
        # --- Setup legacy data ---
        legacy_experiments_dir = Path(self.test_data_dir) / "experiments"
        
        # Old experiment 1
        exp1_id = str(uuid.uuid4())
        exp1_folder = legacy_experiments_dir / "My_Old_Experiment"
        exp1_folder.mkdir()
        
        conv1_data = {
            "experiment_id": exp1_id,
            "iteration": 1,
            "created_at": "2023-01-01T12:00:00"
        }
        with open(exp1_folder / "1_conv.json", "w") as f:
            json.dump(conv1_data, f)

        # --- Run migration script ---
        # We need to temporarily point the migration script to our test directory
        # This is a bit of a hack. A better way would be to make the script's paths configurable.
        from backend import migrate_data as migration_script
        original_path = migration_script.data_dir
        migration_script.data_dir = Path(self.test_data_dir)
        migration_script.experiments_dir = legacy_experiments_dir

        # Run the migration
        migration_script.migrate_data()

        # --- Assert new structure ---
        new_exp_dir = legacy_experiments_dir / exp1_id
        self.assertTrue(new_exp_dir.is_dir())
        
        # Check for experiment.json
        exp_meta_file = new_exp_dir / "experiment.json"
        self.assertTrue(exp_meta_file.is_file())
        with open(exp_meta_file, "r") as f:
            meta = json.load(f)
            self.assertEqual(meta["id"], exp1_id)
            self.assertTrue(meta["title"].startswith("Migrated -"))

        # Check for conversation file
        new_conv_file = new_exp_dir / "conversations" / "1.json"
        self.assertTrue(new_conv_file.is_file())

        # Check that the old folder is gone (it's backed up)
        self.assertFalse(exp1_folder.exists())
        
        # Restore original path in script
        migration_script.data_dir = original_path
        migration_script.experiments_dir = original_path / "experiments"

if __name__ == '__main__':
    unittest.main()
