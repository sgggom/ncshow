# ttws original-game puzzle collection

Source: https://github.com/barrycohen/ttws
Commit: bae298c18b3fdead2cfddd006bd2be7609ca0b31
Source file: witness_puzzles (195 records), retained verbatim.
Upstream project license: MIT, Copyright (c) 2017 barrycohen; see LICENSE.txt.

The author describes witness_puzzles as containing many puzzles encountered in The Witness. This is a community transcription, not an official or complete release. Individual panels have not been independently matched against the original game. The upstream software license is not a claim of ownership over the original game's designs.

78 records are currently playable and have reference solutions validated by our runtime. The import report records every input row, including unsupported rules and searches that did not find a solution within the budget. Unsupported rules are not silently discarded from playable puzzles.

Rebuild: python3 scripts/import-ttws-puzzles.py
Conversion reads base64/protobuf directly using the format documented by ttws/grid.proto and loader.py; no upstream executable code is run.
