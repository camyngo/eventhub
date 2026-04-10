# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a new TypeScript + Node.js project in early setup. The source directories (`src/`, `config/`, `dist/`, `examples/`) are currently empty.

## Tech Stack (from installed dependencies)

- **Runtime:** Node.js + TypeScript (`ts-node` for development)
- **AI:** `@anthropic-ai/sdk` — Anthropic Claude API client
- **Linting/Formatting:** ESLint with `@typescript-eslint`, Prettier
- **Config:** `dotenv` for environment variables

## Directory Layout

- `src/` — Main source code
- `config/` — Configuration files
- `dist/` — Compiled JavaScript output
- `examples/` — Example scripts

## Notes

- No `package.json` exists yet — add one before running scripts
- A `package.json` with `scripts` for `build`, `lint`, and `dev` should be created as the project develops
- Environment variables are managed via `dotenv`; add a `.env` file based on any `.env.example` created
