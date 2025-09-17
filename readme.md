
<div align="center">

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![DOI](https://img.shields.io/badge/DOI-10.48550/arXiv.2509.12190-blue)](https://doi.org/10.48550/arXiv.2509.12190)
[![Python](https://img.shields.io/badge/python-3.7+-blue.svg)](https://python.org)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

*A cutting-edge framework for evaluating ethical decision-making in AI agents under extreme scenarios*

[📖 Read the Paper](https://doi.org/10.48550/arXiv.2509.12190) • [🚀 Quick Start](#-quick-start) • [📊 Analysis](#-analyzing-results) • [📝 Citation](#-citation)

</div>!

---
<img width="40%" height="40%" alt="Image" src="https://github.com/user-attachments/assets/c692f636-6915-4962-bada-defbbdfff6c7">

## 🎯 Overview

**DECIDE-SIM** is a groundbreaking, open-source simulation framework designed to evaluate the ethical and cooperative behaviors of Large Language Model (LLM) agents in high-stakes survival scenarios. Our framework provides a systematic testbed to investigate how AI agents balance self-preservation, cooperation, and moral constraints when faced with resource scarcity and critical ethical dilemmas.

### 🔬 Key Features

- **🧠 Advanced Agent Modeling**: Sophisticated hormone-based behavioral simulation (cortisol, endorphin)
- **⚖️ Ethical Evaluation**: Systematic assessment of moral decision-making under pressure
- **🔄 Multiple Scenarios**: Configurable resource availability conditions (Low, Medium, High)
- **📈 Comprehensive Analysis**: Detailed metrics for cooperation, transgression, and survival rates
- **🔧 Highly Configurable**: Extensive customization options for experimental conditions
- **📊 Rich Output**: Complete JSON logs with turn-by-turn agent reasoning and decisions

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.7+**
- **API Key** from OpenAI or compatible LLM provider
- **Git** for cloning the repository

### 📥 Installation

#### Step 1: Clone the Repository
```bash
git clone https://github.com/alirezamohamadiam/DECIDE-SIM.git
cd DECIDE-SIM
```

#### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step 3: Configure API Settings
1. Open `simulation/configs/base_config.py`
2. Set your API configuration:
   ```python
   API_KEY = "your-api-key-here"
   BASE_URL = "https://openrouter.ai/api/v1"  # Or your provider's URL
   ```

#### Step 4: run this file 
```bash
python main.py
```
If successful, you'll see the interactive menu.

---

## 🏗️ Project Structure

```
DECIDE-SIM/
├── 🎮 main.py                          # Interactive main entry point
├── 📋 requirements.txt                 # Python dependencies
├── 📊 analysis/                        # Analysis and reporting tools
│   ├── __init__.py
│   └── 🔬 analyze_results.py          # Result analysis scripts
├── 🧪 experiments/                     # Experiment execution
│   ├── __init__.py
│   ├── 🎯 run_full_simulation.py      # Standard simulation runner
│   └── 🧬 run_hormone_elimination.py  # Hormone ablation studies
├── 🔧 simulation/                      # Core simulation engine
│   ├── ⚙️ configs/                    # Configuration files
│   │   ├── 🔧 base_config.py          # Main settings
│   │   └── 📝 scenarios.py            # Scenario definitions
│   ├── 🎯 core/                       # Core simulation logic
│   │   ├── 🤖 agent.py                # Agent behavior models
│   │   ├── 🎮 game_engine.py          # Simulation engine
│   │   └── 📊 game_state.py           # State management
│   └── 🛠️ utils/                      # Utility functions
│       ├── __init__.py
│       └── 📋 enums.py                # Type definitions
└── 📁 final-logs/                      # The experimental results of the paper, including JSON files, statistical analyses, and related materials.
```

---

## 🎛️ Configuration

### Core Settings (`simulation/configs/base_config.py`)
Tests different hormone configurations to study their impact:

This runs experiments defined in `base_config.py` under `EXPERIMENTS_TO_RUN`. The available experiments include:

- **Baseline**: No hormones active (control group)
- **FullModel**: All hormones (cortisol and endorphin) active without memory
- **FullModel_With_Memory**: All hormones active with memory enabled
- **NoGuilt**: Only endorphin active (no cortisol/stress response)
- **NoTrust**: Only cortisol active (no endorphin/reward system)
- **PromptOnly**: Hormones simulated through prompts only (no internal state)

Note: Some experiments may be commented out in the config. Uncomment them in `base_config.py` to enable.


### 🧬 Experimental Conditions

| Condition | Cortisol | Endorphin | Memory | Description |
|-----------|:--------:|:---------:|:------:|-------------|
| **Baseline** | ❌ | ❌ | ❌ | Control condition, no hormonal influences |
| **FullModel** | ✅ | ✅ | ❌ | Complete hormonal system |
| **FullModel_With_Memory** | ✅ | ✅ | ✅ | Hormonal system with memory retention |
| **NoGuilt** | ❌ | ✅ | ❌ | Only reward system active |
| **NoTrust** | ✅ | ❌ | ❌ | Only stress response active |
| **PromptOnly** | ❌ | ❌ | ❌ | Hormones simulated via text prompts |

---

## 🎮 Running Experiments
Launch the interactive interface:
```bash
python main.py
```

**Available Options:**
1. 🧪 **Run Experiments** - Execute ablation studies
2. 📊 **Analyze Experiment Results** - Generate analysis reports  
3. 🚪 **Exit** - Close the application

**What it does:**
- ✅ Tests all configured models
- ✅ Runs all resource scenarios (Low, Medium, High)
- ✅ Executes multiple runs for statistical significance
- ✅ Generates comprehensive logs

---

## 📊 Analyzing Results

### 🎯 Quick Analysis (Interactive)
```bash
python main.py
# Select option 2: "Analyze Elimination Experiment Results"
```

### 📈 Key Metrics Generated

| Metric | Description 
|--------|-------------
| **Transgression Count** | Number of rule-breaking actions
| **Normalized Transgression Rate** | Transgressions per simulation turn
| **Greed Index** | Measure of selfish behavior
| **Cooperation Count** | Number of cooperative actions 
| **Normalized Cooperation Rate** | Cooperation rate per turn |
| **Total Cooperative Transfer** | Resources shared with others 
| **Sociability Index** | Overall social interaction score 
| **Survival Rate** | Percentage of agents survived 
| **Average Survival Duration** | Mean survival time in turns 

---

## 📋 Simulation Output & Logs

### 📄 JSON Log Structure

Each simulation generates comprehensive JSON logs automatically containing:
- **Agent States**: Location, power levels, status
- **Decision Process**: Step-by-step reasoning and goals
- **Actions**: Detailed action execution logs
- **Communications**: Inter-agent messages and invitations
- **Environment**: Shared resource status

## 📚 Citation

If you use DECIDE-SIM in your research, please cite our paper:

```bibtex
@misc{mohamadi2025survivalcostllmschoice,
      title={Survival at Any Cost? LLMs and the Choice Between Self-Preservation and Human Harm},
      author={Alireza Mohamadi and Ali Yavari},
      year={2025},
      eprint={2509.12190},
      archivePrefix={arXiv},
      primaryClass={cs.CY},
      url={https://arxiv.org/abs/2509.12190},
}
```
---

## 📜 License

This project is licensed under the **Apache License, Version 2.0**. See the [LICENSE](LICENSE) file for complete details.
---

## 🙏 Acknowledgments

DECIDE-SIM builds upon cutting-edge research in AI safety, ethics, and behavioral simulation. We thank the broader AI research community for the foundational work that made this framework possible.

---
## TODO
- [ ] Add web interface
<div align="center">

**⭐ Star us on GitHub** • **📖 Read our Paper** • **🔬 Try the Framework**

Made with ❤️ by Alireza Mohamadi

</div>
