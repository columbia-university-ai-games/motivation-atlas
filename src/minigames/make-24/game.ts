export type MathSymbol = "+" | "−" | "×" | "÷" | "(" | ")";
export type FormulaToken =
  | { kind: "number"; value: number; cardId: number }
  | { kind: "symbol"; value: MathSymbol };

export interface Evaluation {
  valid: boolean;
  value: bigint | null;
  reason: string;
  key: string | null;
}

export interface ScoreResult {
  score: number;
  streak: number;
  change: number;
  breakdown: string;
}

type Node = { kind: "number"; value: bigint } | { kind: "operation"; op: string; left: Node; right: Node };

/** Make a fresh bag for each hand and draw six cards without replacement. */
export function dealHand(random: () => number = Math.random): number[] {
  const bag = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) => [n, n, n]);
  for (let i = 0; i < 6; i++) {
    const j = i + Math.floor(random() * (bag.length - i));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag.slice(0, 6);
}

function parser(tokens: FormulaToken[]): { node: Node | null; error: string } {
  const input = tokens.map((token) => token.kind === "number" ? String(token.value) : token.value === "−" ? "-" : token.value === "×" ? "*" : token.value === "÷" ? "/" : token.value);
  let at = 0;
  const peek = () => input[at];
  function primary(): Node {
    if (peek() === "(") {
      at++;
      const node = expression();
      if (peek() !== ")") throw new Error("Close the parenthesis.");
      at++;
      return node;
    }
    const value = peek();
    if (value === undefined || !/^\d+$/.test(value)) throw new Error("Place a number here.");
    at++;
    return { kind: "number", value: BigInt(value) };
  }
  function product(): Node {
    let left = primary();
    while (peek() === "*" || peek() === "/") {
      const op = input[at++];
      left = { kind: "operation", op, left, right: primary() };
    }
    return left;
  }
  function expression(): Node {
    let left = product();
    while (peek() === "+" || peek() === "-") {
      const op = input[at++];
      left = { kind: "operation", op, left, right: product() };
    }
    return left;
  }
  try {
    if (input.length === 0) return { node: null, error: "Add numbers and operations to build a formula." };
    const node = expression();
    if (at !== input.length) return { node: null, error: "Check the order of your numbers and operations." };
    return { node, error: "" };
  } catch (error) {
    return { node: null, error: error instanceof Error ? error.message : "That formula is incomplete." };
  }
}

function canonical(node: Node): string {
  if (node.kind === "number") return node.value.toString();
  if (node.op === "+" || node.op === "*") {
    const pieces: string[] = [];
    const flatten = (n: Node) => {
      if (n.kind === "operation" && n.op === node.op) { flatten(n.left); flatten(n.right); }
      else pieces.push(canonical(n));
    };
    flatten(node);
    pieces.sort();
    return `${node.op}[${pieces.join(",")}]`;
  }
  return `${node.op}[${canonical(node.left)},${canonical(node.right)}]`;
}

function calculate(node: Node): { value: bigint | null; error: string } {
  if (node.kind === "number") return { value: node.value, error: "" };
  const left = calculate(node.left);
  if (left.value === null) return left;
  const right = calculate(node.right);
  if (right.value === null) return right;
  switch (node.op) {
    case "+": return { value: left.value + right.value, error: "" };
    case "-": return { value: left.value - right.value, error: "" };
    case "*": return { value: left.value * right.value, error: "" };
    case "/":
      if (right.value === 0n) return { value: null, error: "A formula cannot divide by zero." };
      if (left.value % right.value !== 0n) return { value: null, error: "Every division must give a whole number." };
      return { value: left.value / right.value, error: "" };
    default: return { value: null, error: "Unknown operation." };
  }
}

export function formulaText(tokens: FormulaToken[]): string {
  return tokens.map((token) => token.kind === "number" ? String(token.value) : token.value).join(" ");
}

/** Evaluate tokens using normal arithmetic precedence and integer-only division. */
export function evaluateFormula(hand: number[], tokens: FormulaToken[]): Evaluation {
  const seen = new Set<number>();
  for (const token of tokens) {
    if (token.kind !== "number") continue;
    if (!hand[token.cardId] || hand[token.cardId] !== token.value) {
      return { valid: false, value: null, reason: "That number card is not in this hand.", key: null };
    }
    if (seen.has(token.cardId)) return { valid: false, value: null, reason: "Each number card can be used only once.", key: null };
    seen.add(token.cardId);
  }
  const parsed = parser(tokens);
  if (!parsed.node) return { valid: false, value: null, reason: parsed.error, key: null };
  const key = canonical(parsed.node);
  const result = calculate(parsed.node);
  if (result.value === null) return { valid: false, value: null, reason: result.error, key };
  if (result.value !== 24n) return { valid: false, value: result.value, reason: `That equals ${result.value}, not 24.`, key };
  return { valid: true, value: result.value, reason: "That makes 24!", key };
}

/** Apply the replaceable Make24 scoring schedule to one accepted evaluation. */
export function scoreSubmission(
  tokens: FormulaToken[], evaluation: Evaluation,
  previousScore: number, previousStreak: number,
): ScoreResult {
  if (!evaluation.valid) {
    const score = Math.max(0, previousScore - 20);
    return { score, streak: 0, change: score - previousScore, breakdown: "−20 for an incorrect formula; streak reset" };
  }
  const numbers = tokens.filter((token): token is Extract<FormulaToken, { kind: "number" }> => token.kind === "number");
  const values = numbers.map((token) => token.value);
  let points = 20;
  const notes = ["+20 correct"];
  let bonus = 0;
  for (const n of values) {
    if (n === 5 || n === 10) bonus += 10;
    if (n === 7 || n === 9 || n === 11) bonus += 20;
  }
  if (bonus) { points += bonus; notes.push(`+${bonus} number bonus`); }
  if (numbers.length === 4) { points += 20; notes.push("+20 for 4 numbers"); }
  if (numbers.length === 5) { points += 40; notes.push("+40 for 5 numbers"); }
  if (tokens.some((token) => token.kind === "symbol" && token.value === "÷")) { points += 40; notes.push("+40 for division"); }
  const numberMultiplier = numbers.length === 6 ? 2 : 1;
  const streak = previousStreak + 1;
  const streakMultiplier = streak > 1 ? streak : 1;
  if (numberMultiplier > 1) notes.push("×2 for all 6 numbers");
  if (streakMultiplier > 1) notes.push(`×${streakMultiplier} streak`);
  const change = points * numberMultiplier * streakMultiplier;
  return { score: previousScore + change, streak, change, breakdown: `${notes.join("; ")} = +${change}` };
}

/** A hand change ends a streak without changing the accumulated score. */
export function breakStreak(): number {
  return 0;
}
