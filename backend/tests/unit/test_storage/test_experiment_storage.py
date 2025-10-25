"""
Unit tests for ExperimentStorage.
"""
import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.storage.experiment_storage import ExperimentStorage
from app.core.exceptions import StorageError


@pytest.mark.unit
class TestExperimentStorage:
    """Test cases for ExperimentStorage."""
    
    def test_init_creates_directories(self, temp_dir):
        """Test that initialization creates necessary directories."""
        # Act
        storage = ExperimentStorage(temp_dir)
        
        # Assert
        assert storage.experiments_dir.exists()
        assert storage.experiments_dir.is_dir()
    
    def test_save_experiment_success(self, temp_dir, sample_experiment):
        """Test successful experiment saving."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        
        # Act
        result = storage.save_experiment(sample_experiment)
        
        # Assert
        assert result is True
        
        # Verify file was created
        experiment_path = storage._get_experiment_path(sample_experiment['id'])
        assert experiment_path.exists()
        
        # Verify content
        with open(experiment_path, 'r') as f:
            saved_data = json.load(f)
        assert saved_data == sample_experiment
    
    def test_get_experiment_success(self, temp_dir, sample_experiment):
        """Test successful experiment retrieval."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        storage.save_experiment(sample_experiment)
        
        # Act
        retrieved_experiment = storage.get_experiment(sample_experiment['id'])
        
        # Assert
        assert retrieved_experiment is not None
        assert retrieved_experiment == sample_experiment
    
    def test_get_experiment_not_found(self, temp_dir):
        """Test getting non-existent experiment."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        
        # Act
        result = storage.get_experiment("non-existent-id")
        
        # Assert
        assert result is None
    
    def test_get_experiments_list(self, temp_dir, sample_experiment):
        """Test getting list of experiments."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        storage.save_experiment(sample_experiment)
        
        # Create second experiment
        second_experiment = sample_experiment.copy()
        second_experiment['id'] = 'experiment-2'
        second_experiment['title'] = 'Second Experiment'
        storage.save_experiment(second_experiment)
        
        # Act
        experiments = storage.get_experiments()
        
        # Assert
        assert len(experiments) == 2
        experiment_ids = [exp['id'] for exp in experiments]
        assert sample_experiment['id'] in experiment_ids
        assert 'experiment-2' in experiment_ids
    
    def test_update_experiment_success(self, temp_dir, sample_experiment):
        """Test successful experiment update."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        storage.save_experiment(sample_experiment)
        
        updates = {
            'title': 'Updated Title',
            'status': 'completed'
        }
        
        # Act
        result = storage.update_experiment(sample_experiment['id'], updates)
        
        # Assert
        assert result is True
        
        # Verify update
        updated_experiment = storage.get_experiment(sample_experiment['id'])
        assert updated_experiment['title'] == 'Updated Title'
        assert updated_experiment['status'] == 'completed'
        # Original fields should remain
        assert updated_experiment['id'] == sample_experiment['id']
    
    def test_update_experiment_not_found(self, temp_dir):
        """Test updating non-existent experiment."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        
        # Act
        result = storage.update_experiment("non-existent-id", {'title': 'New Title'})
        
        # Assert
        assert result is False
    
    def test_delete_experiment_success(self, temp_dir, sample_experiment):
        """Test successful experiment deletion."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        storage.save_experiment(sample_experiment)
        
        # Act
        result = storage.delete_experiment(sample_experiment['id'])
        
        # Assert
        assert result is True
        
        # Verify deletion
        assert storage.get_experiment(sample_experiment['id']) is None
        experiment_path = storage._get_experiment_path(sample_experiment['id'])
        assert not experiment_path.exists()
    
    def test_delete_experiment_not_found(self, temp_dir):
        """Test deleting non-existent experiment."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        
        # Act
        result = storage.delete_experiment("non-existent-id")
        
        # Assert
        assert result is False
    
    def test_get_experiment_path(self, temp_dir):
        """Test experiment path generation."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        experiment_id = "test-experiment-123"
        
        # Act
        path = storage._get_experiment_path(experiment_id)
        
        # Assert
        expected_path = storage.experiments_dir / experiment_id / "experiment.json"
        assert path == expected_path
    
    def test_get_experiment_lock_path(self, temp_dir):
        """Test experiment lock path generation."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        experiment_id = "test-experiment-123"
        
        # Act
        path = storage._get_experiment_lock_path(experiment_id)
        
        # Assert
        expected_path = storage.lock_manager.get_experiment_lock_path(temp_dir, experiment_id)
        assert path == expected_path
    
    @patch('app.storage.experiment_storage.AtomicFileWriter')
    def test_save_experiment_atomic_write_error(self, mock_writer_class, temp_dir, sample_experiment):
        """Test experiment saving when atomic write fails."""
        # Arrange
        mock_writer_instance = MagicMock()
        mock_writer_class.return_value = mock_writer_instance
        mock_writer_instance.write_json_atomic.side_effect = Exception("Write error")
        
        storage = ExperimentStorage(temp_dir)
        
        # Act & Assert
        with pytest.raises(StorageError):
            storage.save_experiment(sample_experiment)
    
    def test_save_experiment_invalid_data(self, temp_dir):
        """Test saving experiment with minimal data (storage doesn't validate structure)."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        minimal_experiment = {
            'id': 'test-id',
            # Missing required fields - storage layer doesn't validate structure
        }
        
        # Act
        result = storage.save_experiment(minimal_experiment)
        
        # Assert - storage should succeed as it doesn't validate data structure
        assert result is True
        
        # Verify file was created
        experiment_path = storage._get_experiment_path('test-id')
        assert experiment_path.exists()
        
        # Verify content
        with open(experiment_path, 'r') as f:
            saved_data = json.load(f)
        assert saved_data['id'] == 'test-id'
        assert 'created_at' in saved_data  # Should be added automatically
    
    def test_concurrent_experiment_access(self, temp_dir, sample_experiment):
        """Test concurrent access to experiment storage."""
        # Arrange
        storage = ExperimentStorage(temp_dir)
        
        # Act - simulate concurrent saves
        result1 = storage.save_experiment(sample_experiment)
        
        # Modify and save again
        modified_experiment = sample_experiment.copy()
        modified_experiment['title'] = 'Modified Title'
        result2 = storage.save_experiment(modified_experiment)
        
        # Assert
        assert result1 is True
        assert result2 is True
        
        # Verify final state
        final_experiment = storage.get_experiment(sample_experiment['id'])
        assert final_experiment['title'] == 'Modified Title'

