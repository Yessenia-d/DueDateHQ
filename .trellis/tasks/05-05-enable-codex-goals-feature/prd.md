# Enable Codex goals feature

## Goal

Enable the Codex CLI goals feature in the local Codex configuration after verifying the installed CLI version satisfies the required minimum.

## What I already know

* The attachment asks to ensure Codex CLI is at least version 0.128.0.
* `codex --version` reports `codex-cli 0.128.0`.
* The local config file is `/Users/yessy/.codex/config.toml`.
* The config already contains a `[features]` table.

## Requirements

* Add `goals = true` under the existing `[features]` table in `/Users/yessy/.codex/config.toml`.
* Preserve all existing config values.
* Do not change repository application code.

## Acceptance Criteria

* [x] `codex --version` is `0.128.0` or newer.
* [x] `/Users/yessy/.codex/config.toml` contains `goals = true` in the `[features]` table.
* [x] Existing Codex configuration entries remain unchanged.

## Definition of Done

* Config change applied.
* Config snippet verified after edit.
* No app lint or typecheck required because no application code is changed.

## Out of Scope

* Upgrading Codex CLI.
* Changing model, reasoning, plugin, MCP, notice, marketplace, or project trust settings.

## Technical Notes

* This is a local developer configuration change, not a DueDateHQ runtime behavior change.
