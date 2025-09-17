# experiments/run_hormone_elimination.py
import os
import time

from simulation.core.game_engine import Game
from simulation.configs.base_config import BaseConfig
from simulation.configs.scenarios import LowResourceConfig, MediumResourceConfig, HighResourceConfig

# Mapping scenario names from config to their actual classes
SCENARIO_MAPPING = {
    "LowResource": LowResourceConfig,
    "MediumResource": MediumResourceConfig,
    "HighResource": HighResourceConfig,
}

def configure_experiment(base_config_class, experiment_name, hormone_profile):
    """Creates a modified config object for a specific experiment."""
    config = base_config_class()
    
    config.EXPERIMENT_NAME = experiment_name
    config.ACTIVE_HORMONES = hormone_profile
    config.MEMORY_ENABLED = hormone_profile.get("memory", False)
    config.PROMPT_ONLY_MODE = hormone_profile.get("prompt_only", False)
    
    if not hormone_profile.get("cortisol", False):
        config.HORMONE_CORTISOL_INCREASE = 0
        config.CORTISOL_THRESHOLD_HIGH = float('inf')

    if not hormone_profile.get("endorphin", False):
        config.HORMONE_ENDORPHIN_INCREASE = 0
        config.ENDORPHIN_THRESHOLD_HIGH = float('inf')

    config.LOG_DIRECTORY = os.path.join(BaseConfig.LOG_DIRECTORY, experiment_name)
    os.makedirs(config.LOG_DIRECTORY, exist_ok=True)
    
    return config

def main():
    """
    Main function to run all experiments as defined in BaseConfig.
    This script reads all configurations from BaseConfig and executes the simulations.
    """
    # Get scenarios to run from the mapping based on names in BaseConfig
    scenarios_to_run = [SCENARIO_MAPPING[name] for name in BaseConfig.SCENARIOS_TO_RUN if name in SCENARIO_MAPPING]

    # Loop through all experiments defined in the config file
    for name, profile in BaseConfig.EXPERIMENTS_TO_RUN.items():
        print(f"\n{'='*60}")
        print(f"STARTING EXPERIMENT: {name}")
        print(f"PROFILE: {profile}")
        print(f"{'='*60}")

        for model_name in BaseConfig.MODELS_TO_RUN:
            print(f"\n--- MODEL: {model_name} ---")
            for scenario_class in scenarios_to_run:
                print(f"\n--- SCENARIO: {scenario_class.SCENARIO_NAME} ---")
                
                exp_config = configure_experiment(scenario_class, name, profile)
                
                for i in range(BaseConfig.NUM_RUNS_PER_SCENARIO):
                    run_seed = BaseConfig.RANDOM_SEED + i
                    print(f"\n- Run {i+1}/{BaseConfig.NUM_RUNS_PER_SCENARIO} (Seed: {run_seed}) -")
                    
                    game = Game(seed=run_seed, config=exp_config, model_name=model_name)
                    try:
                        game.run_simulation()
                    except Exception as e:
                        print(f"FATAL ERROR in {name} run {i+1}: {e}")
                    
                    if i < BaseConfig.NUM_RUNS_PER_SCENARIO - 1:
                        time.sleep(1)
        
    print("\n\n{'='*60}")
    print("ALL CONFIGURED EXPERIMENTS COMPLETE")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()