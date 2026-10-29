# Make 24

Motivator: Challenge. Author: tony-wang-zh.

## Mechanic

Press **Start** to draw six cards of numbers from 1 to 12. Click cards and operation buttons, or drag them into the formula row. Click a formula token to remove it. Use each number card at most once; use operations as often as you'd like. Parentheses and ordinary arithmetic precedence apply. Every division must produce a whole number. Press **= 24** to submit. A correct formula equals 24. **Next hand** draws 6 new numbers and clears that hand’s history.

A formula cannot be submitted again in a commutative reordering, such as `2 + 3` and `3 + 2`; distributive rewrites are treated as different formulas. 

**Scoring:** Turn scoring on or off at any time; changing it clears the history and score. Check **i** button for scoring rules.

## Dynamic

Six different numbers present a different mathematical challenge each time. The fact that numbers cannot be reused requires mental math fluency and pre-planning from players. 

(Prediction) Adding the scoring present a much stronger **challenge**: the player is encouraged to build multiple formulas to score more to gain streaks, is challenged to build more complicated formulas through complexity bonuses, and need to double check their solutions lest a incorrect submission breaks the streak and incurs penalty. The streak mechanic also present higher-level strategy such as saving complex formulas for later to maximize value of streak multipliers. 

(Self-play) After turning on scoring, the most notable change is that I double check my formula before clicking submit, since now there are something to lose if I accidentally submit a wrong formula. I also think a little bit about the multiplier and try to compound them to get a higher score.

## Aesthetic

Challenge: Without scoring, building a successful formula presents an interesting mental challenge. A player is likely to be engaged for short periods with low concentration or stress. With scoring, the player might feel more intense and more focused, since the challenge element of obtaining higher score now requires precision and some pre-planning.  

## Sources

Idea: As a kid I played this game with my parents when we are stuck in traffic, using numbers from the plate of other cars. 

Using scoring as a way to present the challenge element: __Score-keeping and speeded responses, which set goals beyond the goal__ (Malone 1980, p. 66).

AI credit: Codex wrote the code for this game in its entirety.
One thing I didn't considered at first and needed to clarify: (AI) What makes formulas “equivalent”? I propose treating formulas as duplicates when their normalized expression structure is the same, including swapped operands for commutative operations. General mathematical equivalence, such as distributive rewrites, is much broader and needs a more specific rule. (my answer) For the purpose of education, treat swapped operands and commutative operations (re-ordering) as equivalent and not eligible for re-submission. distributive rewrites and more complicated math equivalence are not considered duplicate or equivalent in this setup and can be re-submitted. 