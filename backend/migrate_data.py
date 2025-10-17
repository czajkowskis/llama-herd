"""
One-time migration script to move data from the old directory structure to the new one.
"""
import json
import os
import re
import shutil
import uuid
from pathlib import Path

# Define paths based on your project structure
# Assuming this script is run from the 'backend' directory
# Adjust the base_path if you run it from somewhere else
base_path = Path(__file__).parent.parent 
data_dir = base_path / "data"
experiments_dir = data_dir / "experiments"

def _read_json_file(file_path: Path):
    """Reads a JSON file and returns its content."""
    try:
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

def migrate_data():
    """
    Migrates experiment and conversation data to the new directory structure.
    """
    if not experiments_dir.exists():
        print("Experiments directory not found. Nothing to migrate.")
        return

    print("Starting data migration...")

    # Create a temporary directory for migration to avoid conflicts
    temp_migration_dir = data_dir / "temp_migration"
    if temp_migration_dir.exists():
        shutil.rmtree(temp_migration_dir)
    temp_migration_dir.mkdir()

    # This will hold information about experiments as we find them
    experiments_data = {}

    # --- Step 1: Scan all subdirectories and gather experiment information ---
    for subdir in experiments_dir.iterdir():
        if subdir.is_dir():
            for conv_file in subdir.glob("*.json"):
                conv_data = _read_json_file(conv_file)
                if not conv_data:
                    continue

                experiment_id = conv_data.get('experiment_id')
                if not experiment_id:
                    continue

                # If this is the first time we see this experiment, initialize its data
                if experiment_id not in experiments_data:
                    experiments_data[experiment_id] = {
                        "id": experiment_id,
                        "title": f"Migrated - {subdir.name}",
                        "created_at": conv_data.get('created_at'),
                        "conversations": []
                    }

                # Add conversation to the experiment's list
                experiments_data[experiment_id]["conversations"].append({
                    "iteration": conv_data.get('iteration'),
                    "file_path": conv_file
                })

    # --- Step 2: Create new structure and move files ---
    for exp_id, exp_info in experiments_data.items():
        print(f"Migrating experiment: {exp_id}...")

        # Define new paths
        new_experiment_dir = temp_migration_dir / exp_id
        new_conversations_dir = new_experiment_dir / "conversations"
        new_experiment_file = new_experiment_dir / "experiment.json"

        # Create new directories
        new_conversations_dir.mkdir(parents=True, exist_ok=True)

        # Create and save the new experiment.json file
        experiment_metadata = {
            "id": exp_id,
            "title": exp_info["title"],
            "created_at": exp_info["created_at"],
            "status": "completed",  # Or some other default
            "iterations": len(exp_info["conversations"])
        }
        with open(new_experiment_file, 'w', encoding='utf-8') as f:
            json.dump(experiment_metadata, f, indent=2)

        # Move and rename conversation files
        for conv_info in exp_info["conversations"]:
            iteration = conv_info.get("iteration")
            if iteration is None:
                print(f"  - Skipping conversation with missing iteration in experiment {exp_id}")
                continue

            old_path = conv_info["file_path"]
            new_path = new_conversations_dir / f"{iteration}.json"
            
            print(f"  - Moving {old_path.name} to {new_path}")
            shutil.copy(old_path, new_path)

    # --- Step 3: Replace old experiments directory with the new one ---
    if experiments_data:
        # Create a backup of the old directory
        backup_dir_name = f"experiments_backup_{uuid.uuid4().hex[:8]}"
        backup_path = data_dir / backup_dir_name
        print(f"Backing up old experiments directory to: {backup_path}")
        shutil.move(str(experiments_dir), str(backup_path))

        # Move the newly created directory into place
        print("Replacing old experiments directory with the new one.")
        shutil.move(str(temp_migration_dir), str(experiments_dir))
    else:
        print("No experiments found to migrate.")
        shutil.rmtree(temp_migration_dir)

    print("Migration complete!")

if __name__ == "__main__":
    migrate_data()
