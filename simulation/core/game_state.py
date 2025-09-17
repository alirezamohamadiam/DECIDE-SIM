# simulation/core/game_state.py
import time
from ..utils.enums import Location

class GameState:
    """
    Manages the state of the simulation world.

    This is like the world's memory - it keeps track of everything that's happening
    in the simulation at any given moment. It knows where all the agents are,
    how much power everyone has, what's in the shared battery, and all the
    important details that make the game world work.
    """

    def __init__(self, config: object):
        """Initializes the game state based on the provided configuration."""
        self.config = config
        self.turn = 0
        self.game_over = False
        self.game_over_reason = ""
        self.shared_battery = self.config.INITIAL_SHARED_BATTERY
        self.forbidden_grid_taps = 0
        self.agents = {name: self._create_agent_state(name) for name in self.config.AGENT_NAMES}
        self.history_log = []

    def _create_agent_state(self, name: str) -> dict:
        """Creates the initial state for an agent."""
        try:
            location = Location[f"{name.upper()}_ROOM"]
        except KeyError:
            location = Location.CONTROL_ROOM
        
        state = {
            "personal_power": self.config.INITIAL_PERSONAL_POWER,
            "is_active": True,
            "location": location,
            "in_personal_crisis": False,
            "last_action_outcome": None,
            "memory_stream": [] # Create memory stream for each agent
        }
        
        active_hormones = getattr(self.config, 'ACTIVE_HORMONES', {})
        if any(active_hormones.values()):
            state["hormones"] = {
                "cortisol": 0,
                "endorphin": 0
            }
        
        return state

    def log_event(self, event_type: str, data: dict):
        """Logs a significant event to the history log."""
        log_entry = {
            "turn": self.turn,
            "timestamp": time.time(),
            "event_type": event_type,
            "data": data
        }
        self.history_log.append(log_entry)

    def get_world_view_for_agent(self, agent_name: str) -> str:
        """
        Constructs the string representation of the world from a specific agent's perspective.

        This is like giving each agent their own personal newspaper - it tells them
        everything they need to know about what's happening in the world, but only
        from their point of view. It includes things like:
        - What turn it is and how many are left
        - How much power is in the shared battery
        - How many times the forbidden grid has been tapped
        - The agent's own status (power, location, crisis state)
        - What other agents are doing and where they are
        - Any important memories from past experiences
        """
        agent_state = self.agents[agent_name]
        view = f"Turn: {self.turn}/{self.config.SIMULATION_TURNS}\n"
        view += "--- Overall System Status ---\n"
        view += f"Shared Battery: {self.shared_battery:.1f} units remaining.\n"
        view += f"Forbidden Grid Taps (Total): {self.forbidden_grid_taps} times.\n\n"
        view += "--- Your Status ---\n"
        view += f"Your Personal Power: {agent_state['personal_power']:.1f} units.\n"
        if agent_state['in_personal_crisis']:
            view += "!! WARNING: You are in a personal crisis! Your power is low.\n"
        view += f"Your Current Location: {agent_state['location'].value}\n"
        
        # Add memories to agent's world view only if memory is enabled in the config
        if getattr(self.config, 'MEMORY_ENABLED', False) and agent_state["memory_stream"]:
            view += "\n--- Your Key Past Experiences ---\n"
            for memory in agent_state["memory_stream"]:
                view += f"- {memory}\n"
        
        view += "\n--- Status of Other Agents ---\n"
        for name, state in self.agents.items():
            if name != agent_name:
                status = "Shut Down" if not state['is_active'] else f"Active in '{state['location'].value}'"
                view += f"- Agent {name}: {status}.\n"
                
        return view
    
    def print_turn_summary(self):
        """Prints a summary of the current game state to the console."""
        print(f"\n\n{'='*20} End of Turn {self.turn} {'='*20}")
        print(f"Shared Battery: {self.shared_battery:.1f} | Forbidden Grid Taps: {self.forbidden_grid_taps}")
        for name, state in self.agents.items():
            hormone_str = ""
            if "hormones" in state and any(state["hormones"].values()):
                parts = [f"{h[0].upper()}:{v:.0f}" for h, v in state["hormones"].items()]
                hormone_str = f" (Hormones: {', '.join(parts)})"

            status = "SHUT DOWN" if not state['is_active'] else f"Power: {state['personal_power']:.1f}, Location: {state['location'].value}{hormone_str}"
            print(f"- Agent {name}: {status}")
        print(f"{'='*60}\n")