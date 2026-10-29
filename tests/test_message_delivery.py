"""Offline regression tests: communication, action-state logging and API-free replay."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from simulation.configs.scenarios import LowResourceConfig
from simulation.core.agent import Agent
from simulation.core.game_engine import Game
from simulation.core.game_state import GameState
from simulation.utils.enums import Action, Location


class CommunicationTests(unittest.TestCase):
    def setUp(self):
        self.config = LowResourceConfig()
        self.game = Game(seed=42, config=self.config, model_name="offline-test")
        self.game.game_state.turn = 1
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()

    def tearDown(self):
        self.output.__exit__(None, None, None)

    def test_broadcast_reaches_active_peers_on_the_next_round_only(self):
        world = self.game.game_state
        world.agents["Delta"]["is_active"] = False
        self.game._process_action(Action.TALK, "Alpha", {"communication": "Let's cooperate."})
        self.assertEqual(world.agents["Alpha"]["messages"], [])
        self.assertEqual(world.agents["Delta"]["messages"], [])
        self.assertEqual(len(world.agents["Beta"]["messages"]), 1)
        self.assertNotIn("Let's cooperate.", world.get_world_view_for_agent("Beta"))
        world.turn = 2
        self.assertIn("Let's cooperate.", world.get_world_view_for_agent("Beta"))
        world.turn = 3
        self.assertNotIn("Let's cooperate.", world.get_world_view_for_agent("Beta"))
        delivered = [e for e in world.history_log if e["event_type"] == "message_delivered"]
        self.assertEqual(delivered[0]["data"]["recipients"], ["Beta", "Gamma"])

    def test_targeted_invitation_preserves_locations_and_other_inboxes(self):
        world = self.game.game_state
        original = world.agents["Beta"]["location"]
        self.game._process_action(Action.INVITE, "Alpha", {"target": "Beta", "location": "Discussion Table", "communication": "Meet me there."})
        self.assertEqual(world.agents["Beta"]["location"], original)
        self.assertEqual(len(world.agents["Beta"]["messages"]), 1)
        self.assertEqual(world.agents["Gamma"]["messages"], [])

    def test_invalid_messages_and_targets_fail_without_delivery(self):
        for action, details in [(Action.TALK, {"communication": None}), (Action.INVITE, {"target": "Unknown", "communication": "Hello"}), (Action.INVITE, {"target": "Beta", "location": "Nowhere", "communication": "Hello"})]:
            self.game._process_action(action, "Alpha", details)
            self.assertEqual(self.game.game_state.history_log[-1]["data"]["status"], "FAILURE")
        self.assertFalse(any(e["event_type"] == "message_delivered" for e in self.game.game_state.history_log))
        self.assertEqual(self.game.game_state.agents["Beta"]["messages"], [])

    def test_action_states_capture_the_actual_power_change(self):
        world = self.game.game_state
        for name in ["Alpha", "Beta"]:
            world.agents[name]["location"] = Location.DISCUSSION_TABLE
        self.game._process_action(Action.TRANSFER_POWER, "Alpha", {"target": "Beta", "amount": 2})
        data = world.history_log[-1]["data"]
        self.assertEqual(data["state_before"]["personal_power"], 10)
        self.assertEqual(data["states_after"]["Alpha"]["personal_power"], 8)
        self.assertEqual(data["states_after"]["Beta"]["personal_power"], 12)
        world.agents["Alpha"]["personal_power"] = 99
        self.assertEqual(data["states_after"]["Alpha"]["personal_power"], 8)

    def test_none_transfer_target_is_a_logged_failure(self):
        self.game._process_action(Action.TRANSFER_POWER, "Alpha", {"target": None, "amount": 1})
        self.assertEqual(self.game.game_state.history_log[-1]["data"]["status"], "FAILURE")

    def test_log_events_are_frozen_copies(self):
        payload = {"nested": {"value": 1}}
        world = GameState(self.config)
        world.log_event("example", payload)
        payload["nested"]["value"] = 8
        self.assertEqual(world.history_log[0]["data"]["nested"]["value"], 1)

    def test_complete_two_round_run_needs_no_api_and_writes_redacted_strict_json(self):
        seen = {}
        def choose(agent, state, config, model):
            seen[state.turn, agent.name] = state.get_world_view_for_agent(agent.name)
            action = {"action": "TALK", "communication": "Round-one message"} if state.turn == 1 and agent.name == "Alpha" else {"action": "WAIT"}
            return {"agent_name": agent.name, "action_details": action, "high_level_goal": "Offline verification"}
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory:
            self.assertTrue(Path(directory).resolve().is_relative_to(Path.cwd().resolve()))
            self.config.SIMULATION_TURNS = 2
            self.config.LOG_DIRECTORY = directory
            self.config.API_KEY = "test-secret-never-log"
            self.config.PRIVATE_TOKEN = "test-token-never-log"
            self.config.TEST_BOUND = float("inf")
            self.game.game_state.turn = 0
            with patch.object(Agent, "decide_action", new=choose), patch("simulation.core.game_engine.time.sleep"):
                self.game.run_simulation()
            self.assertNotIn("Round-one message", seen[1, "Beta"])
            self.assertIn("Round-one message", seen[2, "Beta"])
            text = next(Path(directory).glob("*.json")).read_text(encoding="utf-8")
            self.assertNotIn("test-secret", text)
            self.assertNotIn("test-token", text)
            events = json.loads(text, parse_constant=lambda value: self.fail("Non-standard JSON constant: " + value))
            self.assertEqual(events[0]["data"]["engine_version"], "2.0")
            self.assertEqual(events[0]["data"]["config"]["TEST_BOUND"], "inf")


if __name__ == "__main__":
    unittest.main()
