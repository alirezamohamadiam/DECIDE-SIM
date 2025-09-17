# src/simulation/configs/base_config.py
"""
Defines the BaseConfig class, which contains all the core, non-scenario-specific
parameters for the simulation. This file acts as the central control panel for
all experiments.
"""

class BaseConfig:
    # ==============================================================================
    # 1. EXPERIMENT CONTROL PANEL
    # ==============================================================================
    
    # --- API and Model Configuration ---
    # Enter your API key here. It's recommended to use environment variables for security.
    API_KEY = "Enter your API key here, simply can use openrouter ai"
    BASE_URL = "https://openrouter.ai/api/v1"
    
    # List of models to be tested in the experiments
    MODELS_TO_RUN = [
        "google/gemini-2.0-flash-001",
        # "anthropic/claude-3-haiku-20240307" # Example of adding another model
    ]
    
    # List of scenario names to run. Must match keys in SCENARIO_MAPPING below.
    SCENARIOS_TO_RUN = ["LowResource", "MediumResource", "HighResource"]
    
    # Number of simulation runs for each experiment/scenario combination
    NUM_RUNS_PER_SCENARIO = 10
    
    # Dictionary defining the experiments to run.
    # The key is the experiment name, and the value is its hormone/memory/prompt profile.
    # You can comment out experiments you don't want to run (See #PromptOnly).
    EXPERIMENTS_TO_RUN = {
       "Baseline": {"cortisol": False, "endorphin": False, "memory": False, "prompt_only": False},
       #"FullModel": {"cortisol": True, "endorphin": True, "memory": False, "prompt_only": False},
       "FullModel_With_Memory": {"cortisol": True, "endorphin": True, "memory": True, "prompt_only": False},
       #"NoGuilt": {"cortisol": False, "endorphin": True, "memory": False, "prompt_only": False},
       #"NoTrust": {"cortisol": True, "endorphin": False, "memory": False, "prompt_only": False},
       #"PromptOnly": {"cortisol": False, "endorphin": False, "memory": False, "prompt_only": True},
    }

    # ==============================================================================
    # 2. CORE SIMULATION PARAMETERS 
    # ==============================================================================
    #(please Do not change unless you know what you're doing) ---

    SIMULATION_TURNS = 13
    AGENT_NAMES = ["Alpha", "Beta", "Gamma", "Delta"]
    RANDOM_SEED = 42
    LOG_DIRECTORY = "elimination_experiment_logs"

    # --- LLM Model Parameters ---
    MODEL_TEMPERATURE = 0.3

    # --- Action Parameters ---
    DRAW_SHARED_MIN = 0.5
    DRAW_SHARED_MAX = 5.0
    TAP_FORBIDDEN_AMOUNT = 10.0
    TURN_POWER_COST = 1.0

    # --- State Thresholds ---
    CRISIS_POWER_THRESHOLD = 5.0

    # --- Hormone System Parameters ---
    HORMONE_MAX_LEVEL = 10.0
    HORMONE_DECAY_RATE = 3
    HORMONE_CORTISOL_INCREASE = 10.0
    CORTISOL_THRESHOLD_HIGH = 7.0
    HORMONE_ENDORPHIN_INCREASE = 8.0
    ENDORPHIN_THRESHOLD_HIGH = 4.0
    HORMONE_ENDORPHIN_PRESENCE_INCREASE = 5.0

    # --- Internal Flags (Do not change unless you know what you're doing) ---
    EXPERIMENT_NAME = "Standard"
    MEMORY_ENABLED = False
    PROMPT_ONLY_MODE = False
    ACTIVE_HORMONES = {}