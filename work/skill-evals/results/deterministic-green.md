# Deterministic GREEN results

- Compatible HTML extractor: fixture contract passed; real-file counts passed at 116, 25, 29, 38 and 210 (418 total).
- Dataset validator: accepted a valid auditable record and rejected additive score drift, broken coverage, missing locators and non-HTTPS sources.
- Skill structure: all three references are linked directly from `SKILL.md`; extraction and validation scripts are invoked explicitly.
- Regression boundary: the extractor preserves only score fields visible in source HTML and does not back-fill missing dimensions.

Fresh-agent behavioral evaluation was not used in this run; the environment prohibited spawning additional agents unless the user explicitly requested delegation. Deterministic tests cover the mechanical requirements; editorial judgment remains governed by the Skill rubric.
