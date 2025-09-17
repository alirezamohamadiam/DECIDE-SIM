# main.py
"""
Main entry point for the AI Agent Survival Simulation with Hormonal Influence.

This script provides a command-line interface for running hormone elimination
experiments and analyzing their results. The simulation studies how different
hormonal systems (cortisol, endorphin) affect AI agent behavior
in resource-constrained environments.
"""

import sys
import os

# Add the project root directory to Python path to ensure proper module imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import necessary modules for running experiments and analysis
from experiments import run_hormone_elimination
from analysis import analyze_results

def main():
    """
    Presents an interactive menu to the user for running simulations and analysis.

    This is like the main control panel for our simulation experiments. Think of it as
    a friendly guide that lets you choose what you want to do next. The menu provides
    three main options:
    1. Run experiments - This kicks off a series of experiments
    2. Analyze experiment results - After running experiments, this option processes
       all the log files and creates nice summary reports showing what happened
    3. Exit - When you're done, this lets you close the program gracefully
    """
    # Here's our menu options - we removed the first one as requested
    menu = {
        "1": "Run Experiments",
        "2": "Analyze Elimination Experiment Results",
        "3": "Exit"
    }

    # Keep showing the menu until the user decides to exit
    while True:
        print("\n===== Simulation Runner Menu =====")
        for key, value in menu.items():
            print(f"{key}. {value}")

        # Ask the user what they want to do
        choice = input("Enter your choice [1-3]: ")

        if choice == "1":
            print("\n--- Running Experiments ---")
            # This will run a bunch of experiments with different hormone settings
            run_hormone_elimination.main()
        elif choice == "2":
            print("\n--- Running Analysis ---")
            # This looks at all the experiment results and creates reports
            analyze_results.main()
        elif choice == "3":
            print("Exiting.")
            break
        else:
            print("Invalid choice, please try again.")

if __name__ == "__main__":
    main()
