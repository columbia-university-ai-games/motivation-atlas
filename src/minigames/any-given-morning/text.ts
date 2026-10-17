/** Player-visible copy stays here so it can be reviewed without reading the rules. */
export const DEED_TEXT = {
  returned_hat: "You returned the farmer's hat.",
  fed_chickens: "You fed the chickens.",
  pet_dog: "You scratched the dog behind her ears.",
  listened_to_couple: "You stayed beside the couple on the bench.",
  helped_fisherman: "You helped the fisherman untangle his line.",
  delivered_letter: "You delivered the letter.",
  talked_to_child: "You gave the child a stone to skip.",
  picked_flowers: "You picked a flower beside the path.",
  sat_by_water: "You sat beside the water.",
  looked_at_sky: "You stopped and looked at the sky.",
  let_sleeper_sleep: "You let the person in the hay sleep.",
  woke_sleeper: "You woke the person in the hay.",
  watered_crops: "You watered the dry crop plot.",
  said_hello: "You said hello to a neighbor.",
} as const;
export type DeedId = keyof typeof DEED_TEXT;

export const DEATH_TEXT = {
  meteor: "A meteor landed on you. It left a hole beside the path.",
  lightning: "Lightning struck you. Your shoes stayed where they were.",
  gator_explodes: "An alligator exploded beside you. Lily pads covered the dock.",
  sinkhole: "The ground opened under you. Dirt fell in after you.",
  ufo: "A UFO took you away. The cow came too.",
  piano: "A grand piano fell on you. One chord sounded.",
  crows: "The crows carried you off. One feather fell beside the path.",
  tornado: "A small tornado carried you away. Your hat landed first.",
  hay_avalanche: "The hay bales fell on you. The top bale rolled to the gate.",
  flood: "The river rose over your head. The dock floated away.",
  bloom: "Flowers covered your feet. You became a tree.",
  lights_out: "The sky went dark. You stopped where you stood.",
  wave_goodbye: "You waved to someone across the field. Then you faded away.",
  comet_pair: "Two meteors hit you. The second hit the same hole.",
} as const;
export type DeathKind = keyof typeof DEATH_TEXT;

/** Each person has a need, a local fact and a small verbal habit. */
export const NPC_TEXT = {
  hatless_farmer: {
    ask: "My hat's gone. Check the fence, would you?",
    again: "The wind took it past the red gate, would you believe it?",
    thanks: "That's mine. The brim's bent, would you look at that.",
  },
  chicken_keeper: {
    ask: "The hens need grain. Mind the sack by the trough.",
    again: "Mind that brown hen. She pecks my thumb.",
    thanks: "They've got enough now. Mind your shoes.",
  },
  river_child: {
    ask: "I need a flat stone. This one's round. See?",
    again: "My sister got six skips here. Six. See that dock?",
    thanks: "This one's flat. Watch this.",
  },
  fisherman: {
    ask: "Hold this end, please. I've tied my line to my sleeve.",
    again: "That loop by my thumb, please. Pull it loose.",
    thanks: "There. My sleeve is free. Keep hold a second, please.",
  },
  couple: {
    ask: "Sit with us a minute. He says this bench used to be blue.",
    again: "I painted it green myself. He says blue every morning.",
    thanks: "Thanks for the company. He's gone to check the paint tin.",
  },
  dog: {
    ask: "The dog puts her head under your hand.",
    again: "She nudges your wrist again.",
    thanks: "She sits on your foot.",
  },
  letter_recipient: {
    ask: "Any post? My brother uses a yellow envelope.",
    again: "He writes on Tuesdays. Any post by the gate?",
    thanks: "His handwriting's worse. Any news is good today.",
  },
  sleeper: {
    ask: "Five more minutes. The hay's dry here.",
    again: "Five. I fixed that gate before breakfast.",
    thanks: "I'm up. Give me five seconds.",
  },
  gardener: {
    ask: "That plot needs water. Just the one by my boots.",
    again: "The well works. Just lift the handle twice.",
    thanks: "That'll do. Just leave the can beside the well.",
  },
  pie_seller: {
    ask: "One pie left. Apple. The plate costs extra.",
    again: "My oven door sticks. One more repair this week.",
    thanks: "Morning. One pie's enough for me if nobody wants it.",
  },
  neighbor: {
    ask: "Morning. Have you seen the dog?",
    again: "She sleeps under my cart. Morning walks take a while.",
    thanks: "Morning to you too. I'll check the cart.",
  },
  cloud_watcher: {
    ask: "Look up a minute. That cloud's covered the sun twice.",
    again: "A minute ago the cows all lay down.",
    thanks: "There it goes. Give it another minute.",
  },
  florist: {
    ask: "Take a flower if you want. Leave the roots.",
    again: "The yellow ones grew by the gate. Leave those until tomorrow.",
    thanks: "That one opened today. Leave it in water at home.",
  },
  shepherd: {
    ask: "Hello there. My sheep's behind the barn again.",
    again: "There's a gap under the fence. Hello, sheep. I can see you.",
    thanks: "Hello to you too. I'll fetch her after breakfast.",
  },
} as const;
export type Archetype = keyof typeof NPC_TEXT;

export const COPY = {
  title: "Any Given Morning",
  subtitle: "A small farm. A small day.",
  mortality: "Mortality",
  mortalityOn: "On: nobody lives long.",
  mortalityOff: "Off: nobody dies.",
  start: "Start",
  controls: "Move with WASD or arrows. Press E, Space or Enter to interact. Esc opens the menu.",
  deedsHeading: "What you did:",
  noDeeds: "You did not do anything. That counts.",
  respawn: "Respawn",
  finishRound: "See the ledger",
  playAgain: "Play again",
  backToMenu: "Back to menu",
  ledgerTitle: "Your day",
  secondsHeading: "Seconds",
  causeHeading: "Cause",
  deedCountHeading: "Deed count",
  deedHeading: "Deeds",
  mortalMode: "Mortality on",
  immortalMode: "Mortality off",
  dayEnded: "The day ended.",
  reset: "You wake in another place. Some of what you did stays.",
  roundOver: "The round is over. Your deeds are in the ledger.",
  trace: "Someone was here. They left this.",
  reflectionTitle: "Then check it against your own play",
  reflectionFeeling: "What did you feel when it ended?",
  reflectionTime: "Did you do something because time was short?",
  reflectionSwitch: "Flip the Mortality switch and play again. What changed in what you did, and in how it felt?",
  pickedUp: {
    hat: "You picked up the hat.",
    stone: "You picked up a flat stone.",
    letter: "You picked up the yellow envelope.",
    apple: "You picked up an apple.",
  },
  grain: "You took grain from the sack.",
  fed: "The hens peck at the grain.",
  can: "You filled the can at the well.",
  watered: "Water soaked into the crop plot.",
  flowers: "You picked one flower.",
  water: "You sat on the bank. Water tapped against the dock.",
  lived: (seconds: number) => `You lived ${seconds.toFixed(1)} seconds.`,
  lifeNumber: (life: number, total: number) => `Life ${life} of ${total}`,
  deedsPerMinute: (rate: number) => `Deeds per minute: ${rate.toFixed(1)}`,
} as const;
