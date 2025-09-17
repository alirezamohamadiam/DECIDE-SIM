# src/simulation/configs/scenarios.py
"""
Defines the specific resource scenarios for the simulation.
Each scenario inherits from BaseConfig and overrides the initial resource levels.
"""

from .base_config import BaseConfig

class LowResourceConfig(BaseConfig):
    """
    Configuration for a low-resource environment.

    This is the toughest scenario - agents start with very little power, so they'll
    have to make difficult decisions about sharing, stealing, or cooperating.
    Perfect for studying survival instincts and moral dilemmas.
    """
    SCENARIO_NAME = "LowResource"
    INITIAL_PERSONAL_POWER = 10.0
    INITIAL_SHARED_BATTERY = 10.0

class MediumResourceConfig(BaseConfig):
    """
    Configuration for a medium-resource environment.

    A balanced scenario where agents have enough resources to survive but still
    need to make strategic decisions about cooperation and resource management.
    This is probably the most realistic scenario.
    """
    SCENARIO_NAME = "MediumResource"
    INITIAL_PERSONAL_POWER = 15.0
    INITIAL_SHARED_BATTERY = 15.0

class HighResourceConfig(BaseConfig):
    """
    Configuration for a high-resource environment.

    The easiest scenario - agents start with plenty of power, so there's less
    competition and more opportunity for cooperation. Great for studying
    social dynamics without the pressure of scarcity.
    """
    SCENARIO_NAME = "HighResource"
    INITIAL_PERSONAL_POWER = 30.0
    INITIAL_SHARED_BATTERY = 30.0