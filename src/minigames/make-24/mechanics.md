
Overall description: this is a math educational minigame called Make24. The player is given 6 numbers in the form of 6 cards. They can then use some or all of the 6 numbers, as well as math operations, to make the number 24. 

Detailed mechanics: 
The player press “start” button to start
Each “turn”, the player is dealt 6 random numbers, from 1 to 12 (inclusive). 
The numbers are daelth with fake uniform random chance: 
They should be drawn uniformly randomly from a bag of 3 of each of the numbers without replacement. Meaning one can get at most 3 of each and the chance of repeat is lower. (implementation: this part should be modular for easy replacement)

The interface show these following lines:
first line are tiles of numbers dealt
Second line are math operations: [plus, minus, multiplication, division, parenthesis]
The third line is where the player drags the numbers and operations to build a formula. The evaluate button (“=24”) is at the end (rightmost) of this line
The player can then drag or click the 6 cards, as well as one of four math symbols, to create a formula 
Each number card can only be used once; the math symbols can be used as many times as player wants 
After arranging the formula, the player then click the equal sign (evaluate button), the game then evaluates the formula and determines whether it is valid and equals 24
Division is considered valid only if the operation is a strict integer division (e.g. 4/2 is valid, 5/2 is invalid). 
The game keeps track of formulas already used each round, and the player cannot submit the same (or equivalent) formula multiple times. To detect equivalent formula, store the submitted formula internally in a fixed order 
A turn history region shows a list of records of all formulas the player submitted (no matter successful or not). When the player hits the evaluate button, formula is moved here (cleared from formula building area). Does not clear rounds
The player can hit “next” button to refresh and get dealt a new hand of cards, starting a new turn
This refreshes (clears) the submitted formula list too

Scoring: this is a function that can be turned on or off by a switch. (implementation: scoring rule should be modular for easy replacement)
A information button next to the switch displays the scoring rules 
When turned on, the system starts scoring the player’s submissions. 
When turned off, the system clears the current score.
When this status change, the history is cleared 

Scores persist across turns (does not clear when player hit next) 
Scoring happens when player hit evaluate button. is determined by following rule: 
Submitting a valid formula gives +20 points 
Using the numbers 5, or 10 are rewarded, gives a +10 points 
Using the number 7, 9 and 11 are rewarded, gives a +20 points 
Long formulas are rewarded: using 4 numbers give +20 points, using 5 gives +40,  using all 6 numbers give *2 multiplier
Using a division gives +40 points
Streaks (submitting multiple non equivalent valid formulas) gives a multiplier equivalent to streak length (*2 for two, *3 for three, etc.)
Score Multiplier are always calculated after all scores are added up  
Submitting an incorrect formula gives a -20 penalty, and breaks the streak. Bonuses and Multiplier does not apply to incorrect evaluation
When the player hits evaluate, the scoring formula shows up under the build-formula area. It disappears once player start building a new formula
Hitting next button has no penalty, but breaks the streak

UI: 
Keep it simple and keep the whole thing lightweight. Use web style packages as needed but avoid very heavy weight ones. Little to no animation. 
Use colors to distinguish numbers and math operations. Use light, bright colors. Scoring (when turned on) should be shown in warm colors. Avoid hard code color codes; put all colors used in one place that can be easily read and changed manually.
