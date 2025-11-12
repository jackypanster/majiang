# Feature Specification: HU Scoring System Complete Implementation

**Feature Branch**: `001-hu-scoring-fixes`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "修复HU计分系统：实现分数转移、回合顺序修正和一炮多响机制"

## Clarifications

### Session 2025-11-12

- Q: What happens when a player wins but the fan calculation results in zero fan? → A: Zero fan HU does not exist. Per PRD §2.5, any valid HU awards at minimum 1 fan (基本胡). The Scorer.calculate_score method guarantees minimum return value of 1.
- Q: How does the system handle concurrent HU responses when one player has insufficient score to pay all winners? → A: Allow negative scores with no minimum limit. Scores always transfer in full to maintain zero-sum property (total = 400). No partial payment or payment ordering needed.
- Q: When multiple players declare HU on the same discard, in what order should they be processed? → A: Process in seating order (clockwise), starting from the discarder's next seat. This aligns with traditional mahjong priority rules and turn rotation logic.
- Q: After multi-HU on a discard, who draws the next tile? → A: The discarder's next seat draws (consistent with FR-005 and Issue #81 fix). The last processed HU winner's position is irrelevant to turn order.
- Q: Can a player who has already won (is_hu=True) continue to declare HU again in blood-battle mode? → A: Yes. Players can win multiple times, accumulating scores with each HU. This is the core blood-battle mechanism. Hand is locked (draw-discard only) but HU responses remain valid.
- Q: Should scoring logic affect core gameplay logic? → A: **No. Scoring must be orthogonal to gameplay.** Score calculation and transfer should never block or alter game flow decisions (HU validation, turn order, tile operations). Scoring is an observer layer, not a controller.

## Design Constraints *(mandatory)*

### Architectural Separation

**Critical Constraint**: Score calculation and transfer logic MUST be architecturally separated from core gameplay logic.

- **Gameplay decisions** (HU validation, turn order, tile drawing, player responses) MUST NOT depend on score values or score calculation results
- **Score transfer** is executed AFTER gameplay state changes are committed (e.g., after is_hu flag is set, after current_player_index is updated)
- **Score calculation errors** (if any) MUST NOT block game progression; zero-sum validation failures should log errors but not prevent turn advancement
- **Scoring is an observer**: The scoring system observes HU events and updates player scores as a side effect, without influencing game rules or flow

**Rationale**: This separation ensures:
1. Core game logic remains testable independently of scoring complexity
2. Score calculation bugs cannot corrupt game state or cause deadlocks
3. Future scoring rule changes do not require modifications to core game engine
4. Clear responsibility boundaries between game mechanics and accounting

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Score Transfer on Winning (Priority: P0)

When a player wins a hand (either by self-draw or by another player's discard), the scoring system calculates the fan value and transfers points between players according to Xue Zhan Dao Di rules.

**Why this priority**: This is the core functionality of the scoring system. Without it, the game cannot produce correct scoreboards or final settlements, making the game unplayable from a scoring perspective.

**Independent Test**: Can be fully tested by setting up a game state where a player wins (either self-draw or discard), verifying that the fan calculation occurs and points are transferred correctly, and delivers a valid scoreboard that maintains zero-sum property.

**Acceptance Scenarios**:

1. **Given** a player has a ready hand and draws the winning tile, **When** they declare HU (self-draw), **Then** the system calculates the fan value, deducts that value from each of the other three players' scores, adds three times that value to the winner's score, and maintains the zero-sum property (total = 400 points)

2. **Given** a player has a ready hand and another player discards the winning tile, **When** the ready player declares HU (discard win), **Then** the system calculates the fan value, deducts that value from the discarder's score, adds that value to the winner's score, and maintains the zero-sum property

3. **Given** a player wins with multiple fan patterns (e.g., pure suit + all triplets), **When** HU is declared, **Then** the system correctly sums all applicable fan bonuses and transfers the total fan value

4. **Given** the wall is empty when a player declares HU (last tile win), **When** scoring is calculated, **Then** the system includes the +1 fan bonus for "sea bottom fishing" in the total

---

### User Story 2 - Correct Turn Order After Discard Win (Priority: P1)

When a player wins off another player's discard, the turn passes to the player who would have played next (discarder's next seat), not the winner's next seat.

**Why this priority**: Incorrect turn order breaks game flow, causes some players to lose turns while others draw too often, and disrupts blood-battle scoring opportunities. This must work correctly for fair gameplay.

**Independent Test**: Can be fully tested by arranging a scenario where a non-adjacent player wins off a discard, then verifying that the next turn goes to the discarder's next seat, not the winner's next seat. Delivers correct turn rotation.

**Acceptance Scenarios**:

1. **Given** player P1 discards a tile and non-adjacent player P3 declares HU, **When** the HU is resolved, **Then** the next turn goes to P2 (P1's next seat), not P4 (P3's next seat)

2. **Given** player P1 discards a tile and adjacent player P2 declares HU, **When** the HU is resolved, **Then** the next turn goes to P2 (who happens to be both P1's next seat and the winner)

3. **Given** a player wins by self-draw, **When** the HU is resolved, **Then** the next turn goes to the winner's next seat (standard rotation)

---

### User Story 3 - Multiple Players Win Same Discard (Priority: P1)

When multiple players have ready hands that can win on the same discarded tile, all eligible players can claim HU simultaneously, and the discarder pays each winner.

**Why this priority**: This is a core mechanic of Xue Zhan Dao Di ("一炮多响"). Without it, the game produces illegal states and unfairly denies ready players their rightful wins.

**Independent Test**: Can be fully tested by setting up a game state where two or three players can win on the same discard, verifying that all players are marked as winners and the discarder's score reflects payment to all winners. Delivers correct multi-HU handling.

**Acceptance Scenarios**:

1. **Given** players P2 and P3 both have ready hands that can win on P1's discard, **When** P1 discards the winning tile, **Then** both P2 and P3 are marked as winners (is_hu=True), processed in seating order (P2 then P3), P1's score is reduced by the sum of both fan values, and P2 and P3's scores each increase by their respective fan values

2. **Given** three players (P2, P3, P4) can all win on P1's discard with different fan counts, **When** P1 discards the winning tile, **Then** all three players win (processed in order P2, P3, P4), P1 pays each player their calculated fan value, and the zero-sum property is maintained

3. **Given** multiple players declare HU on the same discard, **When** the responses are processed, **Then** HU responses take priority over KONG and PONG responses, and all HU responses are executed (not just the first one)

---

### Edge Cases

- **Negative scores in multi-HU**: Player scores can become negative when paying multiple winners. System always transfers full amounts to maintain zero-sum property, with no minimum score floor.
- **Missing discard_player_id**: If discard_player_id is None during a discard HU, system raises InvalidActionError (per FR-011).
- **Self-draw vs discard differentiation**: System determines HU type by presence of discard_player_id parameter (None = self-draw, provided = discard).
- **Blood-battle end condition**: When the last non-winning player declares HU after three others have won, standard scoring rules apply, game continues until wall is empty.
- **Multiple HU by same player**: Players who have already won (is_hu=True) can continue to declare HU and win additional times, accumulating scores with each win while maintaining hand-locked draw-discard only gameplay.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate total fan value using Scorer.calculate_score when a player declares HU, passing all relevant context (player state, extra tile, self-draw flag, kong flower flag, last tile flag, special HU types)

- **FR-002**: System MUST transfer points for self-draw HU by deducting the fan value from each of the other three players and adding three times the fan value to the winner

- **FR-003**: System MUST transfer points for discard HU by deducting the fan value from the discarder and adding the fan value to the winner

- **FR-004**: System MUST verify zero-sum property (total of all player scores equals 400) after every score transfer operation

- **FR-005**: System MUST set current_player_index to the discarder's next seat when resolving a discard HU

- **FR-006**: System MUST set current_player_index to the winner's next seat when resolving a self-draw HU

- **FR-007**: System MUST detect when multiple players respond with ActionType.HU to the same discard

- **FR-008**: System MUST execute score settlement for all players who declare HU on the same discard (multi-HU), processing winners in seating order clockwise from the discarder's next seat

- **FR-009**: System MUST mark all winners as is_hu=True when multiple players win on the same discard

- **FR-010**: System MUST calculate fan values independently for each winner in a multi-HU scenario (different players may have different fan bonuses)

- **FR-011**: System MUST raise InvalidActionError if discard_player_id is None when processing a discard HU

- **FR-012**: System MUST log HU events with relevant details: player ID, HU type (self-draw/discard), fan count, and score changes

- **FR-013**: System MUST prioritize HU responses over KONG and PONG responses when processing player responses

- **FR-014**: System MUST handle the next player draw correctly after multi-HU: after processing all HU winners, set current_player_index to the discarder's next seat (not the last HU winner's next seat), and that player draws the next tile

- **FR-015**: System MUST maintain architectural separation between scoring and gameplay: score calculation and transfer operations MUST execute after gameplay state changes are finalized (is_hu flag set, current_player_index updated, tiles drawn), and MUST NOT influence gameplay decisions or block game flow

### Key Entities

- **Player Score**: Integer value representing player's current points, starts at 100, can be negative, constrained by zero-sum property across all players
- **Fan Value**: Integer calculated from player's hand structure and game context, determines points transferred in HU settlement
- **HU Type**: Either self-draw (winner draws tile) or discard (winner claims another player's discard), affects score transfer rules
- **PlayerResponse**: Action declaration containing player ID, action type (HU/KONG/PENG/PASS), target tile, and priority for response ordering

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a player wins by self-draw, the winner's score increases by exactly 3 times the calculated fan value, and each of the other three players' scores decreases by exactly the fan value

- **SC-002**: When a player wins by discard, the winner's score increases by the calculated fan value, and the discarder's score decreases by the same value

- **SC-003**: After every HU score settlement, the sum of all four players' scores equals exactly 400 (zero-sum property maintained)

- **SC-004**: When multiple players declare HU on the same discard, all players are marked as winners and the discarder's total score reduction equals the sum of all winners' fan values

- **SC-005**: After a discard HU is resolved, the next player to draw is always the player seated after the discarder (not the winner), verified by current_player_index position

- **SC-006**: All existing unit tests continue to pass, and new tests covering score settlement, turn order, and multi-HU scenarios achieve 100% pass rate

- **SC-007**: Gameplay logic tests (HU validation, turn order, tile operations) can execute successfully with scoring logic disabled or mocked, demonstrating architectural independence

## Assumptions

- The Scorer.calculate_score method is already correctly implemented and returns accurate fan values (minimum 1 fan for any valid HU per PRD §2.5)
- The game always has exactly 4 players
- Player scores can go negative (no minimum score constraint)
- The is_hu flag on Player marks a player as having won at least once (blood-battle mode); players with is_hu=True can continue to win multiple times and accumulate scores
- Kong flower and last tile flags can be determined from game state context
- The discard_player_id is always provided when processing a discard HU response
- Turn rotation follows standard mahjong order: player indices 0 → 1 → 2 → 3 → 0
