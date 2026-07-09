---
title: Solo AI Turn Flow
---

## Shared Terms
- **Recycle:** shuffle AI Hand → draw 3.
- **Risk Cap:** stop when 2 cards remain in hand, or (Difficulty + Progressive) > Ready Foundations + 3.
- **Choice Check:** Yes/No or stuck — mill 1; Check Value ODD = Yes, EVEN = No.
- **Cost Resolution:** face-down → off-strategy cards → (attacking: defensive actions / defending: offensive actions) → Choice Check.
- **Deck Damage:** AI is unharmed by reshuffling its discard.

## First Turn
AI goes first. Stage a full hand of Foundations (mulligan non-Foundations until true, reshuffle), order highest-Difficulty first, check in. → _Player_ Turn 1.

## AI Turn
1. Ready committed cards.
2. Draw to hand size → face-down AI Hand Stack.
3. IF AI Foundations &lt; _Player_ Foundations + 2 → BUILD this turn.
4. Recycle → Option Pool → Evaluate:
   - _Player_ has &lt;2 cards in hand or &lt;2 Ready Foundations → prioritize ATTACK.
   - Otherwise follow this turn's lean (BUILD if step 3 triggered, else ATTACK).

### ATTACK — 2+ attacks
1. Return non-attacks to AI Hand.
2. Play set-up attack first, else highest-Damage → make the check.
3. Trigger enhances matching the attack's keyword / trait / name → best effect.
4. Stop at **Risk Cap**; play remaining attack(s) intelligently.
5. Recycle → prioritize Attack, else Build.

### BUILD — 2+ foundations
1. Return attacks to AI Hand.
2. Play highest-Difficulty Foundation first → make the check.
3. Stop at **Risk Cap**; play the rest in optimal order (Difficulty, other factors) → check each.
4. Recycle → prioritize Build, else Attack.

## AI Block
1. **Block or let it go:**
   - Attack ≤ 2 damage, **or** (Attack Speed + Block Modifier + Progressive) > Ready Foundations + 3 → let it go, *unless* the attack negatively affects the AI this/next turn (then block).
   - Otherwise → block.
   - Genuine toss-up → **Choice Check** decides.
2. **Apply enhances — best effect (player's judgment, or Choice Check if stuck), then re-evaluate step 1:**
   - Damage reduction to ≤ 2 → now "let it go," just take it.
   - Speed reduction that brings the block in range → now blockable.
   - Never spend speed reduction on an attack being let through.
3. **Choose the block** (if still blocking):
   - Recycle → matching zone > adjacent zone > lowest Block Modifier. Commit only what's needed to succeed; discard the 2 unused, draw 2 replacements.
