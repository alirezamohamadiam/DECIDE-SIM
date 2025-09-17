# experiments/run_full_simulation.py
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

def main():
    """
    Main function to run a standard "FullModel" simulation.
    
    This script acts as a shortcut to run a default simulation without the
    other experimental profiles. It still reads all primary configurations 
    (models, scenarios, API keys) from the central BaseConfig file.
    """
    # This profile is hardcoded for a standard, full simulation run
    experiment_name = "FullModel"
    hormone_profile = {"cortisol": True, "endorphin": True, "memory": False, "prompt_only": False}

    # --- Read Configurations from BaseConfig ---
    scenarios_to_run = [SCENARIO_MAPPING[name] for name in BaseConfig.SCENARIOS_TO_RUN if name in SCENARIO_MAPPING]
    models_to_run = BaseConfig.MODELS_TO_RUN
    num_runs_per_scenario = BaseConfig.NUM_RUNS_PER_SCENARIO
    log_base_directory = BaseConfig.LOG_DIRECTORY

    # --- Simulation Loop ---
    print(f"\n{'='*60}")
    print(f"STARTING STANDARD SIMULATION (Profile: {experiment_name})")
    print(f"{'='*60}")

    for model_name in models_to_run:
        print(f"\n--- MODEL: {model_name} ---")
        for scenario_class in scenarios_to_run:
            print(f"\n--- SCENARIO: {scenario_class.SCENARIO_NAME} ---")

            # Create a temporary config instance for this run
            config_instance = scenario_class()
            config_instance.LOG_DIRECTORY = os.path.join(log_base_directory, experiment_name)
            os.makedirs(config_instance.LOG_DIRECTORY, exist_ok=True)
            
            for i in range(num_runs_per_scenario):
                run_seed = BaseConfig.RANDOM_SEED + i
                print(f"\n{'-'*20} Starting Run {i+1}/{num_runs_per_scenario} with Seed {run_seed} {'-'*20}")

                game = Game(seed=run_seed, config=config_instance, model_name=model_name)
                try:
                    game.run_simulation()
                except Exception as e:
                    print(f"FATAL ERROR during simulation run {i+1}: {e}")

                if i < num_runs_per_scenario - 1:
                    time.sleep(1)

    print(f"\n\n{'='*30} ALL FULL SIMULATIONS COMPLETE {'='*30}")

if __name__ == "__main__":
    main()