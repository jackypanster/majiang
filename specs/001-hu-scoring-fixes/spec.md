# Feature Specification: HU Scoring System Complete Implementation

**Feature Branch**: `001-hu-scoring-fixes`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "修复HU计分系统：实现分数转移、回合顺序修正和一炮多响机制"

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

1. **Given** players P2 and P3 both have ready hands that can win on P1's discard, **When** P1 discards the winning tile, **Then** both P2 and P3 are marked as winners (is_hu=True), P1's score is reduced by the sum of both fan values, and P2 and P3's scores each increase by their respective fan values

2. **Given** three players (P2, P3, P4) can all win on P1's discard with different fan counts, **When** P1 discards the winning tile, **Then** all three players win, P1 pays each player their calculated fan value, and the zero-sum property is maintained

3. **Given** multiple players declare HU on the same discard, **When** the responses are processed, **Then** HU responses take priority over KONG and PONG responses, and all HU responses are executed (not just the first one)

---

### Edge Cases

- What happens when a player wins but the fan calculation results in zero fan (edge case in scoring logic)?
- How does the system handle concurrent HU responses when one player has insufficient score to pay all winners?
- What happens if the discard_player_id is None during a discard HU (validation error)?
- How does the system differentiate between self-draw HU and discard HU when target_tile is the same?
- What happens when the last player standing wins by self-draw after three others have already won (blood-battle end condition)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate total fan value using Scorer.calculate_score when a player declares HU, passing all relevant context (player state, extra tile, self-draw flag, kong flower flag, last tile flag, special HU types)

- **FR-002**: System MUST transfer points for self-draw HU by deducting the fan value from each of the other three players and adding three times the fan value to the winner

- **FR-003**: System MUST transfer points for discard HU by deducting the fan value from the discarder and adding the fan value to the winner

- **FR-004**: System MUST verify zero-sum property (total of all player scores equals 400) after every score transfer operation

- **FR-005**: System MUST set current_player_index to the discarder's next seat when resolving a discard HU

- **FR-006**: System MUST set current_player_index to the winner's next seat when resolving a self-draw HU

- **FR-007**: System MUST detect when multiple players respond with ActionType.HU to the same discard

- **FR-008**: System MUST execute score settlement for all players who declare HU on the same discard (multi-HU)

- **FR-009**: System MUST mark all winners as is_hu=True when multiple players win on the same discard

- **FR-010**: System MUST calculate fan values independently for each winner in a multi-HU scenario (different players may have different fan bonuses)

- **FR-011**: System MUST raise InvalidActionError if discard_player_id is None when processing a discard HU

- **FR-012**: System MUST log HU events with relevant details: player ID, HU type (self-draw/discard), fan count, and score changes

- **FR-013**: System MUST prioritize HU responses over KONG and PONG responses when processing player responses

- **FR-014**: System MUST handle the next player draw correctly after multi-HU: only the last processed HU winner triggers the next draw

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

## Assumptions

- The Scorer.calculate_score method is already correctly implemented and returns accurate fan values
- The game always has exactly 4 players
- Player scores can go negative (no minimum score constraint)
- The is_hu flag on Player marks a player as having won at least once (blood-battle mode)
- Kong flower and last tile flags can be determined from game state context
- The discard_player_id is always provided when processing a discard HU response
- Turn rotation follows standard mahjong order: player indices 0 → 1 → 2 → 3 → 0
