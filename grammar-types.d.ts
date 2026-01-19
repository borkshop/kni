/**
 * Type definitions for the Kni grammar parser.
 *
 * The grammar is a monadic recursive-descent parser where each parser state
 * is modeled as a class. A trampoline loop advances states by calling `next()`
 * with parsed tokens. States delegate to parent states via continuation methods
 * when they complete their work.
 *
 * Key concepts:
 * - TokenState: A state that can consume tokens from the lexer via `next()`
 * - Continuations: Parent states that receive results from child states
 * - Linkable: Nodes that can be "tied" to create the story graph
 */

import type Scope from './scope';
import type Scanner from './scanner';

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token types produced by the inline lexer.
 * - 'symbol': Individual punctuation characters
 * - 'alphanum': Sequences of letters and numbers
 * - 'number': Numeric literals
 * - 'literal': Quoted strings
 * - 'token': Special multi-character tokens like '->', '<-', '==', etc.
 * - 'start': Beginning of an indented block (text is the leading bullets)
 * - 'stop': End of a block
 * - 'break': Blank line
 * - 'dash': Horizontal rule (---)
 * - 'error': Error recovery token
 */
export type TokenType =
  | 'symbol'
  | 'alphanum'
  | 'number'
  | 'literal'
  | 'token'
  | 'start'
  | 'stop'
  | 'break'
  | 'dash'
  | 'error';

// =============================================================================
// Expression AST
// =============================================================================

/**
 * Expression AST nodes.
 *
 * Expressions are represented as arrays where the first element is the operator:
 * - ['val', n]: Numeric literal
 * - ['get', name]: Variable reference
 * - ['var', literals, expressions]: Dynamic variable with interpolated parts
 * - ['call', target, ...args]: Function/procedure call
 * - [unaryOp, expr]: Unary operation
 * - [binaryOp, left, right]: Binary operation
 */
export type Expression =
  | ValExpression
  | GetExpression
  | VarExpression
  | CallExpression
  | UnaryExpression
  | BinaryExpression;

export type ValExpression = ['val', number];
export type GetExpression = ['get', string];
export type VarExpression = ['var', string[], Expression[]];
export type CallExpression = ['call', Expression, ...Expression[]];
export type UnaryExpression = [UnaryOp, Expression];
export type BinaryExpression = [BinaryOp, Expression, Expression];

export type UnaryOp = 'not' | '-' | '~' | '#';

export type ArithmeticOp = '+' | '-' | '*' | '/' | '%' | '**';
export type ComparisonOp = '<' | '<=' | '==' | '<>' | '>=' | '>';
export type LogicalOp = 'and' | 'or';
export type OtherBinaryOp = 'rem' | '~' | '#';

export type BinaryOp = ArithmeticOp | ComparisonOp | LogicalOp | OtherBinaryOp;

// =============================================================================
// Story Nodes (Linkable)
// =============================================================================

/**
 * Base interface for story nodes that can be linked together.
 * All nodes have a `next` property that names the following node.
 */
export interface StoryNode {
  type: string;
  next: string;
  position: string | null;
}

/**
 * A node that can also branch (conditional jumps, calls).
 */
export interface BranchableNode extends StoryNode {
  branch: string;
}

/**
 * Branch is a wrapper that marks that the wrapped node's 'branch' property
 * should be tied instead of its 'next' property.
 */
export interface BranchWrapper {
  type: 'branch';
  node: BranchableNode;
}

/**
 * Linkable nodes are either regular story nodes or branch wrappers.
 * These can appear in `rets` and `escs` arrays and get "tied" to labels.
 */
export type Linkable = StoryNode | BranchWrapper;

// =============================================================================
// Token State Protocol
// =============================================================================

/**
 * A state that can consume tokens from the lexer.
 *
 * The parser trampoline calls `next()` with each token, and the state
 * returns the next state to use.
 */
export interface TokenState {
  next(type: string, space: string, text: string, scanner: Scanner): TokenState;
}

// =============================================================================
// Continuation Protocols
// =============================================================================

/**
 * Continuation for thread-style parsing.
 *
 * Thread parsing produces two arrays:
 * - `rets`: Nodes to tie to the next instruction (return path)
 * - `escs`: Nodes to tie after the next prompt (escape path)
 *
 * Used by: Thread, Stop, MaybeThread, Option, Program, SwitchBlock, Case, etc.
 */
export interface ThreadContinuation {
  return(scope: Scope, rets: Linkable[], escs: Linkable[], scanner: Scanner): TokenState;
}

/**
 * Continuation for expression parsing.
 *
 * Expression parsing produces an Expression AST node.
 *
 * Used by: BinaryExpression, Open, SetBlock, ToggleBlock, ExpressionBlock, etc.
 */
export interface ExpressionContinuation {
  return(scope: Scope, expression: Expression, scanner: Scanner): TokenState;
}

/**
 * Continuation for label/goto parsing.
 *
 * Similar to ExpressionContinuation but used in the context of labels
 * and goto arrows where the expression identifies a target.
 *
 * Used by: Label, Goto, Cue
 */
export interface LabelContinuation {
  return(scope: Scope, expression: Expression, scanner: Scanner): TokenState;
}

/**
 * Continuation for option annotation parsing.
 *
 * Option annotations like {+x}, {-x}, {!x}, {=n x} produce:
 * - operator: The annotation type ('+', '-', '!', '?', '=', 'keyword', '')
 * - expression: The variable or value
 * - modifier: Optional modifier value
 *
 * Used by: MaybeOption (receives from OptionOperator, OptionArgument, Keyword)
 */
export interface OptionAnnotationContinuation {
  return(
    scope: Scope,
    operator: OptionOperator,
    expression: Expression | string,
    modifier: Expression | undefined,
    scanner: Scanner
  ): TokenState;
}

export type OptionOperator = '+' | '-' | '!' | '?' | '=' | 'keyword' | '';

/**
 * Continuation for case/weight parsing in switch blocks.
 *
 * Used by: Case (receives from MaybeWeightedCase)
 */
export interface CaseContinuation {
  case(args: Expression | null, scanner: Scanner): TokenState;
  weights: Expression[];
}

/**
 * Continuation for the Expect pattern.
 *
 * ThenExpect creates an Expect state that waits for a specific token,
 * then calls this continuation with the accumulated scope and arguments.
 *
 * The signature is variadic because ThenExpect.return() accepts arbitrary
 * arguments that get forwarded to Expect.
 */
export interface ExpectContinuation {
  return(...args: unknown[]): TokenState;
}

/**
 * Simple continuation that resumes without arguments.
 *
 * Used by: ContinueVariable
 */
export interface ResumeContinuation {
  return(): TokenState;
}

// =============================================================================
// Combined Protocols
// =============================================================================

/**
 * A state that both consumes tokens and can receive thread results.
 *
 * Many grammar states implement both TokenState and ThreadContinuation
 * because they handle tokens and also serve as parents for child threads.
 */
export interface ThreadState extends TokenState, ThreadContinuation {}

/**
 * A state that both consumes tokens and can receive expression results.
 */
export interface ExpressionState extends TokenState, ExpressionContinuation {}

// =============================================================================
// Scope Protocol
// =============================================================================

/**
 * Re-export Scope type for convenience.
 * Scope tracks the current position in the story graph and provides
 * methods for creating nodes and managing the path.
 */
export type {Scope};

// =============================================================================
// Switch Block Modes
// =============================================================================

/**
 * Modes for switch block behavior:
 * - 'walk': Sequential iteration (default for {|...})
 * - 'loop': Cycling iteration (for {&...})
 * - 'rand': Random selection (for {~...})
 * - 'pick': Pick one randomly without replacement (for {^...})
 * - 'hash': Hash-based selection (for {#...})
 */
export type SwitchMode = 'walk' | 'loop' | 'rand' | 'pick' | 'hash';

// =============================================================================
// Option Leader Types
// =============================================================================

/**
 * Option leader characters:
 * - '+': Additive option (always shown, increments counter)
 * - '*': Once-only option (hidden after selection)
 */
export type OptionLeader = '+' | '*';
