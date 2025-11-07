<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.0.1
- Modified principles:
  - IV. Fast-Fail Error Handling: Added explicit logging requirements
  - Technical Standards: Added Observability section
- Added sections: Communication Standards
- Removed sections: N/A
- Templates requiring updates:
  ✅ plan-template.md - No changes needed
  ✅ spec-template.md - No changes needed
  ✅ tasks-template.md - No changes needed
- Follow-up TODOs: None
-->

# 血战到底麻将 Constitution

## Core Principles

### I. Simplicity First

**Code should be as simple as possible, but no simpler.**

- Prefer functions over classes unless state management requires objects
- Keep functions under 20 lines; longer functions signal need for decomposition
- Repetition is acceptable if abstraction increases complexity
- No helper/utils directories - code belongs where it's used or in specific modules
- Use Pythonic patterns: list comprehensions, f-strings, context managers, direct boolean returns

**Rationale**: Simple code is maintainable code. Fast-fail with clear errors beats elegant abstraction that obscures problems. Three months from now, straightforward code will be easier to understand than clever code.

### II. Test-First (NON-NEGOTIABLE)

**Tests are written before implementation and must use real objects.**

- Tests MUST use real `GameState`, `Player`, `Tile` instances - NO mocks
- Tests MUST call actual service methods, not stub responses
- One test, one assertion principle
- Test names MUST describe the scenario, not implementation
- If test is hard to write, the design is wrong - refactor

**Rationale**: Mocks test your assumptions, not your code. Real integration tests catch actual bugs. The restriction against mocks forces better design and provides confidence in the system.

### III. Library-First Architecture

**Core game logic is a standalone library with zero external dependencies.**

- `src/mahjong/` contains all game logic: models, services, constants, exceptions
- Library MUST be testable without API layer (FastAPI is future addition, not dependency)
- Models use `@dataclass` with immutability (`frozen=True` for `Tile`)
- Services are stateless functions operating on `GameState`
- Clear boundaries: Models (data) → Services (logic) → API (HTTP adapter)

**Rationale**: Libraries are portable, testable, and force clear contracts. Separating game logic from HTTP concerns enables testing without servers and potential reuse in desktop/mobile clients.

### IV. Fast-Fail Error Handling

**Let errors propagate with complete context; don't catch unless you can fix.**

- Default behavior: let exceptions bubble up with full stack trace
- Only catch exceptions when you have a specific recovery strategy
- Error messages MUST include: function name, file location, player_id, tile/action data, and reason
- Format: `f"Failed in function_name (file.py:line): {reason}, player={player_id}, tile={tile}"`
- Use custom exceptions: `InvalidActionError`, `InvalidGameStateError`
- Add logging at key operations: game creation, phase transitions, player actions, errors
- Use Python's `logging` module with INFO for operations, ERROR for exceptions
- Log format: include timestamp, level, function name, game_id, player_id, action context

**Rationale**: Hidden errors are unfixable. Complete context enables fast debugging. Catching without recovery just obscures the problem and wastes time. Terminal logs provide immediate visibility into code execution flow and help pinpoint issues.

### V. Domain Model Integrity

**The game rules in PRD.md are the single source of truth.**

- All game logic MUST match documented rules in `docs/PRD.md`
- Rule changes require PRD update BEFORE code changes
- Blood Battle special rules (hand locking, continuous play after first win) are non-negotiable
- Zero-sum constraint: total scores ALWAYS equal 400 (4 players × 100 initial points)
- Hand count limits: dealer ≤14, non-dealer ≤13 (post-burial: 11 and 10)

**Rationale**: The domain model is what makes this game unique. Inconsistencies between docs and code create confusion and bugs. The PRD is the contract with users.

## Technical Standards

### Language & Dependencies

- **Python**: 3.8+ (for modern dataclass support)
- **Package Manager**: uv (for fast, deterministic dependency management)
- **Testing**: pytest (ONLY - no unittest, no mock library)
- **Code Quality**: ruff (format + lint, replaces black/flake8/isort)
- **Zero Runtime Dependencies**: Core library (`src/mahjong/`) has no external dependencies beyond Python stdlib

### Code Structure

**Three-layer architecture** (mandatory):

1. **Models** (`src/mahjong/models/`): Immutable data structures
   - `Tile`, `Player`, `GameState`, `Meld`, `PlayerResponse`
   - Use `@dataclass`, prefer `frozen=True`
   - No business logic in models

2. **Services** (`src/mahjong/services/`): Stateless game logic
   - `GameManager`, `PlayerActions`, `WinChecker`, `Scorer`
   - Functions take `GameState`, return new/modified `GameState`
   - All rule enforcement happens here

3. **API** (future: `app/`): Thin HTTP adapter
   - FastAPI routes mapping HTTP → services
   - In-memory game storage: `GAMES: dict[str, GameState]`
   - No business logic in API layer

### Observability

**Logging for debugging and operational visibility:**

- Use Python's standard `logging` module (no external logging frameworks)
- Log at key operations: game creation, phase transitions, player actions
- Log level guidelines:
  - `INFO`: Normal operations (game created, player action processed)
  - `ERROR`: Exceptions and invalid states
  - `DEBUG`: Detailed state information (only when debugging)
- Log format MUST include context: `game_id`, `player_id`, `action_type`, relevant data
- Example: `logger.info(f"Game {game_id}: Player {player_id} discarded {tile}")`
- Avoid over-logging: don't log every function entry/exit, focus on business events

### Naming & Style

- Variables: full descriptive names (`user_email`, `post_title`, not `e`, `t`)
- Functions: verb-noun (`create_game`, `check_win`, `calculate_score`)
- Files: snake_case matching primary class/function
- No abbreviations except domain terms (e.g., `hu` for 胡牌 is acceptable)

## Development Workflow

### Pre-Implementation Checklist

Before writing any code:

1. ✅ Understand the game rule from PRD.md
2. ✅ Write test with real objects that describes expected behavior
3. ✅ Verify test FAILS (red)
4. ✅ Implement simplest solution to pass test (green)
5. ✅ Refactor for clarity (if >20 lines, if repeated >3 times)

### Testing Requirements

**Required test coverage:**

- All game phase transitions (埋牌 → 打牌 → 结束)
- All player actions (bury, discard, pong, kong, hu)
- Blood Battle rules (hand lock, continuous play, score accumulation)
- Win conditions and scoring for all 番型 (fan types)
- Edge cases (draw, wall empty, multiple kongs, etc.)

**Test organization** (mandatory structure):

```
tests/unit/
├── test_game_manager.py        # Game lifecycle
├── test_player_actions_*.py    # Player operations
├── test_win_and_scoring.py     # Win checking and scoring
├── test_blood_battle_rules.py  # Special rules
├── test_edge_cases.py          # Boundary conditions
└── test_error_handling.py      # Invalid actions
```

### Commit Standards

Format: `<type>: <description>` or `<type>(#issue): <description>`

**Types:**
- `feat`: New game feature or rule
- `fix`: Bug fix with issue reference
- `test`: Test additions/modifications
- `docs`: Documentation updates (PRD, algorithm, CLAUDE.md)
- `refactor`: Code restructure without behavior change

**Examples:**
```
feat: implement hand locking after first win
fix(#22): correct hu check after burying cards
test: add edge case for consecutive kongs
docs: update PRD with clarified rules
```

### Three-Try Rule

When stuck:

1. Try straightforward approach
2. Try alternative with different structure
3. Try third fundamentally different approach
4. If still stuck: document all three attempts with errors, ask for help

**Rationale**: Prevents rabbit holes. Three failures indicate missing information or wrong problem framing.

## Governance

### Amendment Procedure

1. Propose change with rationale (why current principle blocks progress)
2. Demonstrate simpler alternative was considered and rejected
3. Update constitution with version bump
4. Update all affected templates and documentation
5. Verify no existing code violates new principle

### Version Semantics

**Format**: MAJOR.MINOR.PATCH

- **MAJOR**: Principle removal or incompatible redefinition (breaks existing workflows)
- **MINOR**: New principle added or substantial expansion
- **PATCH**: Clarification, wording improvement, typo fix

### Compliance Review

- All PRs MUST reference constitution principles in description
- Code reviewer MUST verify no principle violations
- Complexity (e.g., >3 abstraction layers, >20 line functions) MUST be justified in PR
- Constitution violations without justification block merge

### Communication Standards

**Development communication protocol:**

- Internal reasoning and technical analysis: English (for clarity and precision)
- All deliverables and user-facing content: Chinese (documentation, comments, commit messages, issue discussions)
- Code: English (variable names, function names, class names per Python conventions)
- When blocked or uncertain: Immediately raise questions rather than making assumptions

**Rationale**: English thinking ensures access to technical terminology and documentation. Chinese output maintains consistency with project stakeholders and existing documentation.

### Runtime Guidance

For detailed implementation guidance during development, refer to:
- `CLAUDE.md` - Claude Code specific instructions
- `docs/PRD.md` - Complete game rules
- `docs/backend_architecture.md` - System design

**Version**: 1.0.1 | **Ratified**: 2025-01-06 | **Last Amended**: 2025-01-06
