# Validation

The upgraded implementation passes 24 automated checks: 17 JavaScript checks and 7 Python checks. These include:

- All 630 original archived logs reconcile to recorded turn-summary power and locations, successful grid taps, cooperative-transfer counts, and later shutdowns.
- Sample logs load without leaking future dialogue or chart observations into earlier frames.
- Failed actions preserve resources, state is independent across frames, and imported text is escaped.
- Python-generated non-finite constants are accepted without rewriting quoted message text.
- Key moments select the first successful action; round synchronization handles unequal action counts and early-ending runs.
- Matched baseline metadata is verified; differing models, scenarios, seeds and engine versions are detected.
- Moment explanations distinguish reconstructed power state from explicit action-time state.
- The offline app boots and draws in a DOM/canvas harness. Its controls seek and step, compare runs, change comparison selection, enter and exit presentation mode, pause at key moments, show explanations, interact with the power chart, validate invalid imports, and load a custom log.
- Python tests verify next-round broadcast delivery, targeted invitations without forced movement, failed communication, frozen action-state records, credential redaction, strict JSON output, and a complete two-round run with mocked decisions and no API calls.

Browser inspection verified the modular application and the complete offline bundle. Both 3D scenes, key-moment navigation, the explanation panel, synchronized comparison and presentation mode rendered successfully. The browser error/warning log was empty at the comparison check. A second-canvas intrinsic sizing issue found during visual inspection was fixed and rechecked.

The live browser file-chooser check was interrupted by an environment disconnect. File reading and import validation passed automated application checks; the real picker remains unverified in this environment. No remote LLM experiments were launched. Browser behavior outside the tested desktop environment has not been verified.

Run the ordinary checks from the project root:

```sh
python web/build_preview.py
node --test web/tests/replay.test.mjs web/tests/insights.test.mjs
python -m unittest discover -s tests -v
```

For the additional 630-log regression, extract the original archived JSON files to a separate directory and set `DECIDE_QA_LOGS` to its absolute path before running the JavaScript checks. The historical log collection is preserved inside `final-logs/logs.zip`.
