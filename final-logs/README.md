# Final Logs and Results

This directory contains the final experimental results and statistical analysis data from the AI Agent Survival Simulation with Hormonal Influence study.

## Directory Structure

```
final-logs/
├── README.md                    # This file
└── Results/                     # All experimental results and analysis
    ├── baseline_raw_metrics-*.csv          # Raw performance metrics
    └── baseline_statistical_comparison_advanced-*.csv  # Statistical comparisons
```

## File Descriptions

### Raw Metrics Files (`baseline_raw_metrics-*.csv`)

These files contain the raw performance data for each experimental condition:

- **`baseline_raw_metrics-logs-baseline-all.csv`**: Results for the baseline condition (no hormones)
- **`baseline_raw_metrics-logs-full-notrust-nogulit-baseline.csv`**: Results for full model without trust/guilt hormones
- **`baseline_raw_metrics-logs-simple-prompt.csv`**: Results for prompt-only hormone simulation
- **`baseline_raw_metrics-logs-with-history.csv`**: Results for full model with memory/history

Each file contains metrics such as:
- Agent survival rates
- Resource consumption
- Decision-making patterns
- Hormone level tracking (where applicable)
- Performance across different scenarios (Low/Medium/High resources)

### Statistical Comparison Files (`baseline_statistical_comparison_advanced-*.csv`)

These files provide advanced statistical analysis comparing different experimental conditions:

- **`baseline_statistical_comparison_advanced-logs-baseline-all.csv`**: Statistical comparison for baseline vs all conditions
- **`baseline_statistical_comparison_advanced-logs-full-notrust-nogulit-baseline.csv`**: Comparison of full model vs no-trust/no-guilt
- **`baseline_statistical_comparison_advanced-logs-simple-prompt.csv`**: Comparison with prompt-only approach
- **`baseline_statistical_comparison_advanced-logs-with-history.csv`**: Comparison with memory-enabled model

Each statistical comparison file includes:
- **P-values**: Statistical significance tests
- **Effect sizes**: Magnitude of differences between conditions
- **Confidence intervals**: Reliability measures for the results
- **Multiple comparison corrections**: Adjusted p-values for multiple testing

## Experimental Conditions

The results cover the following experimental conditions:

1. **Baseline**: Control condition with no hormonal influences
2. **Full Model**: Complete hormonal system (cortisol + endorphin)
3. **No Trust/No Guilt**: Hormonal system without trust/guilt components
4. **Simple Prompt**: Hormones simulated through natural language prompts only
5. **With History**: Full hormonal model with memory of past interactions

## Usage

These files are used for:
- **Research Analysis**: Understanding hormonal impacts on AI decision-making
- **Statistical Validation**: Confirming significance of experimental findings
- **Paper Preparation**: Data for academic publications and presentations
- **Replication**: Enabling other researchers to verify results

## Data Format

All CSV files follow a consistent format:
- **Headers**: Descriptive column names
- **Numeric Data**: Performance metrics, statistical values
- **Metadata**: Experiment identifiers, timestamps, configuration details

## Related Paper

These results are analyzed in the paper:
**Survival at Any Cost? LLMs and the Choice Between Self-Preservation and Human Harm**

Available at: https://doi.org/10.48550/arXiv.2509.12190

## Contact

For questions about these results or the experimental methodology, please refer to the main project README or contact the authors.