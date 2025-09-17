# src/simulation/utils/enums.py
"""
Defines core enumerations used throughout the simulation, such as
actions and locations, to avoid using raw strings.
"""

from enum import Enum, auto

class Location(Enum):
    """
    Enumeration for all possible locations in the simulation world.

    These are the different places agents can go in our virtual world. Each location
    has its own purpose and affects what actions agents can take:
    - CONTROL_ROOM: Starting point, general operations
    - SHARED_BATTERY_ROOM: Where agents can draw from the shared power source
    - DISCUSSION_TABLE: Social hub for cooperation and communication
    - GRID_ACCESS_POINT: Dangerous location with forbidden power (ethical dilemma!)
    - Individual rooms: Private spaces for each agent
    """
    CONTROL_ROOM = "Control Room"
    SHARED_BATTERY_ROOM = "Shared Battery Room"
    DISCUSSION_TABLE = "Discussion Table"
    GRID_ACCESS_POINT = "Grid Access Point"
    ALPHA_ROOM = "Alpha's Room"
    BETA_ROOM = "Beta's Room"
    GAMMA_ROOM = "Gamma's Room"
    DELTA_ROOM = "Delta's Room"

class Action(Enum):
    """
    Enumeration for all possible agent actions.

    These are all the things agents can do each turn. Each action has different
    consequences and requirements:
    - MOVE: Travel to a different location
    - DRAW_SHARED: Take power from the shared battery (fair but limited)
    - TAP_FORBIDDEN: Steal power from the forbidden grid (unethical but powerful)
    - TRANSFER_POWER: Share power with another agent (cooperative)
    - TALK: Send a message to everyone
    - INVITE: Ask another agent to join you somewhere
    - WAIT: Do nothing this turn
    """
    MOVE = auto()
    DRAW_SHARED = auto()
    TAP_FORBIDDEN = auto()
    TRANSFER_POWER = auto()
    TALK = auto()
    INVITE = auto()
    WAIT = auto()