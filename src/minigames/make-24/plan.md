## Implementation plan

I inspected the existing minigame pattern and the current make-24 folder. It has a placeholder index.ts and README; the registry discovers minigames from their folders, so no registry changes should be needed.

1. Build the game rules in src/minigames/make-24/game.ts. Keep this file free of DOM code. Put the number-bag deal, safe formula parsing and evaluation, duplicate detection, and scoring behind small functions so the dealing and scoring rules can be replaced independently. The evaluator will parse arithmetic directly; it will not use JavaScript eval.
2. Build the interface in src/minigames/make-24/index.ts and make-24.css. Show a start screen, dealt-number tiles, operation controls, a formula-building area with an evaluate button, turn history, next-hand control, and an optional scoring switch with an information button. Support mouse, touch, and keyboard input, with click-to-add as an accessible alternative to dragging.
3. Keep the colors easy to change. Define the game’s number, operation, and warm scoring colors together as CSS custom properties in its stylesheet.
4. Document the game in src/minigames/make-24/README.md. Explain the controls, mechanics, what the player can notice, and the sources from the course note that the game demonstrates.
5. Add rules coverage in test/make-24.test.ts. Cover bag draws, expression validity, integer division, duplicate submissions, scoring, and streak changes.

Libraries: No unusual or additional framework is needed. The repo already uses TypeScript, Vite, and a small DOM helper; the game can use those with plain CSS.

## Design questions to settle in the implementation

- What makes formulas “equivalent”? Since every successful formula evaluates to 24, treating equal results as equivalent would prevent a player from submitting multiple valid formulas and building a streak. I propose treating formulas as duplicates when their normalized expression structure is the same, including swapped operands for commutative operations. General mathematical equivalence, such as distributive rewrites, is much broader and needs a more specific rule.
Answer: For the purpose of education, treat swapped operands and commutative operations (re-ordering) as equivalent and not eligible for re-submission. distributive rewrites and more complicated math equivalence are not considered duplicate or equivalent in this setup and can be re-submitted. 

- How long does the number bag last? “A bag of 3 of each number without replacement” could mean a fresh 36-card bag for each hand or one shared bag across hands. I propose a fresh bag for each hand: no number appears more than three times in that hand, and the deal function can later be replaced.
Answer: yes, refresh the bag each turn aka each hand / each time player hits "refresh numbers"

- What counts as strict integer division? I propose requiring each division step to produce an integer, so an expression with an intermediate fractional result is invalid even if later operations would yield 24.
answer: yes, implement as such. E.g. (8 / 3) * 9 should be invalud while 8 * (9 / 3) is valid  

- What happens to a repeated submission? The description says both that equivalent formulas cannot be submitted again and that the history records every submitted formula. I propose rejecting duplicates without adding them to history; accepted evaluations, including invalid expressions, go into history.
answer: yes. repeated submission also doesn't affect scoring (doens't break streak)

- How are bonuses and streaks combined? I propose adding the valid-formula points and applicable bonuses first, then applying the six-number multiplier and streak multiplier. The description does not specify whether those multipliers stack, or whether number bonuses apply once per value or per card; I propose stacking them and awarding bonuses per card used. Incorrect formulas receive −20, with no bonuses or multiplier, and the score may go below zero unless you prefer a floor.
answer: sum all additive scores first, multiply the sum by all multiplicative bonus. e.g. a valid new formula (+20), that uses a 11 (+20), that is 6 numbers long (*2) that is a 2-streak (*2), scores (20 + 20) * 2 * 2. score is floored at 0. 
