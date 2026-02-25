# Rustplusplus Features Analysis

This document analyzes the repository and maps the bot's features to their corresponding locations in the source code (`src/` directory). This list can act as a baseline for adding or removing features.

## 1. Discord Slash Commands

These are the Discord commands users interact with directly.
**Location:** `src/commands/`
Each command typically has its own `.js` file handling its execution.

- `/alarm` (`alarm.js`) - Manage Smart Alarms
- `/alias` (`alias.js`) - Create command aliases
- `/blacklist` (`blacklist.js`) - Blacklist users
- `/cctv` (`cctv.js`) - Get CCTV monument codes
- `/craft` (`craft.js`) - Check craft costs
- `/credentials` (`credentials.js`) - Setup Rust+ credentials
- `/decay` (`decay.js`) - Check decay time
- `/item` (`item.js`), `/stack` (`stack.js`) - Item details
- `/map` (`map.js`) - Display in-game Map
- `/market` (`market.js`) - Vending machine market
- `/players` (`players.js`) - Battlemetrics player data
- `/recycle` (`recycle.js`) - Recycler output
- `/research` (`research.js`) - Research costs
- `/switch` (`switch.js`) - Manage Smart Switches
- `/storagemonitor` (`storagemonitor.js`) - Manage Storage Monitors
- `/upkeep` (`upkeep.js`) - Base upkeep check
- `/uptime` (`uptime.js`), `/leader` (`leader.js`), `/voice` (`voice.js`), `/role` (`role.js`), `/reset` (`reset.js`), `/help` (`help.js`), `/despawn` (`despawn.js`)

## 2. In-Game Commands

Commands typed in the Rust team chat that the bot reacts to (e.g., `!pop`, `!time`, `!cargo`).
**Location:**

- Entry point: `src/rustplusEvents/message.js` (listens to Rust+ team chat messages)
- Handlers: Likely mapped across `src/handlers/` and `src/discordTools/` to process the text triggers.
  _Features included here:_ `afk`, `alive`, `cargo`, `chinook`, `heli`, `large`, `small`, `pop`, `time`, `wipe`, `tr`, `tts`, `vendor`, etc.

## 3. Discord Event Handling

How the bot responds to elements happening in Discord (like when it's added to a server, when a user sends a message, or when they interact with a UI component).
**Location:** `src/discordEvents/`

- `messageCreate.js` - Legacy pre-slash text commands or bridge to Team Chat
- `interactionCreate.js` - Triggers the appropriate command from `src/commands`
- `ready.js` - Bot startup logic
- `voiceStateUpdate.js` - Handling voice channel logic (potentially for TTS feature)
- `guildCreate.js`, `guildMemberRemove.js` - Server join/leave events

## 4. Rust+ Event Notifiers & Handlers

Logic that connects to the official Rust+ server and reacts to in-game statuses.
**Location:** `src/rustplusEvents/`

- `connected.js`, `connecting.js`, `disconnected.js` - Rust+ WebSocket connection lifecycle
- `message.js` - Processing raw messages from Rust+ (notifications, chat, entity updates)

## 5. Background Handlers & Polling

Regularly querying and managing data (like checking vending machines, Battlemetrics tracking, or event dispatching).
**Location:** `src/handlers/`
Contains modular functionality that likely powers both slash commands and in-game commands in the background.

## 6. Integrations & External APIs

Features relying on 3rd party APIs mapping external information into Discord/Rust.
**Location:** `src/external/`
(e.g., Battlemetrics integration for `/players`, translation APIs for `tr`/`trf`).

## 7. Localization / Translations

Support for multiple languages in the bot's outputs.
**Location:** `src/languages/`
Contains translation strings/logic allowing commands like `/tr` and general bots messages to adapt to languages.

## 8. Data Structures & Entities

Internal representations of Rust items, events, users, devices.
**Location:** `src/structures/`
Class definitions and data models representing items, commands, or database entities.

## 9. Utilities & Logic Helpers

Shared functions (math, formatting, text cleanup, geometry).
**Location:** `src/util/`

## 10. Static Configurations

Static data assets like item IDs, lists of monuments, images for switches/alarms.
**Location:** `src/staticFiles/` and `src/resources/`
