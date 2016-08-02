
# Hackni

This document provides a tour of the Kni code, intended for an audience of
hackers.

## The Parser

Kni is a four-stage recursive descent parser. It is responsible for
incrementally generating a story, which is a directed graph of labeled
instructions. The runtime engine walks this graph to generate narrative,
options, and pauses. Where the script may have nesting sub-arcs, the
compiled story is completely flat and resembles an assembly or virtual machine
language.

```
scanner -> outline-lexer -> inline-lexer -> grammar
```

- scanner.js

The scanner is transforms a stream of text into a sequence of lines, tracking
each line’s level of indentation and leading bullets.
The scanner trims lines, collapses internal white space, and strips comments.
The scanner recognizes that lines that start with sequences of space delimited
bullets (`-`, `+`, and `*`) are special, as well as lines consisting of the
prompt sigil, `>`.  The scanner is driven with its `next(text)` and `return()`
methods, these being the JavaScript generator interface.
The scanner drives the outline lexer.

- outline-lexer.js

The outline lexer transforms a stream of lines, each with a known indentation
level and any leading bullets, into a stream of `start`, `stop`, `break`, and
`text` tokens. Each time the outline lexer encounters a line with leading
bullets, it establishes a new indentation depth, writing a start token to go
deeper, or unrolling stop tokens to go shallower. Break tokens indicate blank
lines.  The scanner drives the outline lexer by calling `next(line, scanner)`,
making `scanner.leader` and `scanner.indent` available for indentation
descisions, or `return(scanner)` to terminate the stream.

The outline lexer produces tokens with a `type` and `text`. The `text` always
comes from the original document and the parser can interpret text either as
literal or significant text depending on context or type.  The `start` token
passes the leading bullets as text. The `text` token passes text through. All
other tokens have empty text.

- inline-lexer.js

The inline lexer passes `start`, `stop`, and `break` tokens through without
alteration and breaks `text` tokens into finer `token`, `symbol`, `alphanum`,
`alpha`, and `dash` type tokens, tracking whether each token was preceded by
white space, normalizing all sequences of whitespace as a single space
character.
The outline lexer drives the inline lexer with `next(type, text, scanner)`,
taking a `stop` token instead of a `return()` call to signal the end of stream.
Number tokens greedily consume sequences of numeric digits.
Alphanum tokens are sequences of letters and numbers, including non-english
alphanumeric characters.
Tokens include some one and two character wide special symbols
including `@`, `[`, `]`, `{`, `}`, `|`, `/`, `<`, `>`, `->`, `<-`, `==`, `!=`,
`>=`, and `<=`.
All other characters are treated as individual symbol characters, notably
characters like `%` and `^` that are significant in some contexts but are
merely text in others.

- parser.js

The parser drives the grammar state machine, passing each token through to the
current state and tracking the new resulting state.
The inline lexer drives the parser with `next(type, space, text, scanner)` calls.
Each grammar state has an informative `type` property for debugging, and
accepts the same `next(type, space, text, scanner)` calls, but must also return
a new state.
None of these interfaces throw exceptions. When the grammar encounters an
error, it will track it on the generated story and return a best-effort next
state.

- grammar.js
- expression.js
- variable.js
- story.js

The constructor for each grammar state typically takes a `story`, a `path`, a
`parent` state, loose `ends`, and `jumps`.
A `story` instance contains `states`, an object mapping state names to state
structs, suitable for serialization as JSON and direct consumption by the
Kni runtime engine.
The `story` also tracks an array of `errors`, just in case.
The grammar uses the story’s `create(path, type, arg)` method to create or
update nodes on the story graph. The `path` is the next path that the parser
can consume. The `ends` is an array of paths to nodes that should be tied to
the next node the parser generates in the current context, and `jumps` is an
array of loose paths to connect to the next node after the next prompt node.
Each state is responsible for carrying these to the next state, advancing the
path when necessary, creating child branches in the path, and collecting loose
ends when a state returns to its parent state.

Parent states must implement `return(path, ends, jumps, scanner)`.
This allows the child to thread through the last path in the child sequence,
and allows the parent to collect the ends and jumps.
The return method must return a new parse state, either taking the last child
path, or the next path in the parent sequence.
Some states drop loose ends or join them with their own.

As an interesting example, when the parser encounters a prompt line,
it will create a prompt node in the story, tie all loose ends to the prompt,
and then promote all of the jumps to ends for the next state, with a clear set
of jumps.


## The Runtime

- engine.js

The product of the parser is a JSON instruction graph.
The engine walks this graph, evaluating expressions, switching cases, and
collecting text and options.
The engine drives a "dialog" and a "renderer", which have different
implementations for the web and for the command line.
The engine also takes an optional start state, pluggable storage for the story
variables, and a pluggable random number generator.

The runtime has a method, prefixed with a dollar sign, for each of the
instruction types in the story language.

The engine tracks the current instruction as a sort of program counter.
It also has a stack for "calling" labeled procedures. Labels can be used for
both goto arrow targets or function calls. The function returns when it reaches
the end of a chain of instructions.

The `end` method implements the default behavior for the end of a story, which
is to display the remaining narrative and quit. This method can be patched for
alternate behavior, like resetting storage and starting again from the beginning.

- evaluate.js

The story contains some instructions that evaluate algebraic expressions.
These expressions are like S-expressions using nested JSON arrays.
These mostly wrap JavaScript operators, clamping the range to 32 bit integers.

The engine threads the random number generator through all of these functions.
While naïvely, these use the `Math` object by default, while generating and
verifying transcripts, Kni uses a xorshift128 PRNG to ensure that each
read uses the same sequence of random numbers.

Kni provides operators for simple probability distributions.
The unary random operators (``~n``) provides a number in the half open interval
from [0, n), excluding n. The binary random operators (``n~m``) provides
the sum of `n` samples of a variable in the [0, m) interval, effectively
producing a variable in the [0, n*m) range, but with a bias toward the mean
(n*m/2) that grows with n. The random operator is an homage to the D&D
die roll notation, e.g., 2d6 which has a range of [2, 12] and a mean of 7, with
a triangular histogram of probable die rolls. However, `2~6` is different in
two ways. For one, the interval always starts with zero regardless of the number
of samples (2d6 starts at 2). The distribution also composes better.
2d6-2 produces values in the interval [0, 10], but 2~6 produces values in the
interval [0, 12), effectively [0, 11].

Two novel "operators" in Kni are `hash` and `hilbert`.
These have varied in implementation version over major version, but they
serve procedural narrative generation. The unary hash operator (``#x``)
produces a hash of the given value, handy for generating a seemingly random
but deterministic number from an arbitrary number, like a seed or position in
space or a multiverse. The binary hilbert operator (``x#y``) produces
a position along a winding curve that fills a square around the origin, 64K
tall and wide, assigning a unique number from 0 to 4M to every (x, y)
coordinate. The hash and hilbert operators combine (#x#y) to assign a
pseudorandom number to every position in that space.


## Runtime Hooks

The Engine constructor accepts a `handler` object that can drive bindings
with external scene graphs and data sources and targets.
The handler may implement any of the following methods.

- `has(name)` determines whether the engine’s global scope should
  defer to the handler for reading and writing a variable by name.
  This can match patterns of names, e.g., names beginning with 'external.',
  or specific names like 'time'.
- `get(name)` will receive calls from the engine to get names owned by the
  handler. At present, this must return synchronously. This is handy
  for external continuous variables like time as well as live bindings
  to a database or simulation.
- `set(name, value)` will receive calls from the engine to set names
  owned by the handler.
- `changed(name, value)` will receive notifications from the engine for any
  global variable change.
- `waypoint(state)` receives a snapshot of the narrative state, including
  all global variables, the entire stack, the internal state of the
  random number generator, the current instruction label, and an array
  of answer labels, or simply null for the initial waypoint.
  The engine can `resume(state)` on any waypoint, replaying all of the
  narrative since the dialog’s last answer.
- `goto(label, instruction)` receives notifications for every instruction that
  the engine executes, with the label of that instruction.
  `@label` within a story can trigger external scene changes, like
  showing and hiding supplementary assets or components.
- `ask()` receives a notification whenever the story asks for an answer.
- `answer(text)` receives a notification when the story receives an answer.
- `end(engine)` receives a notification when a story runs to its conclusion.


## Dialogs

A dialog is responsible for prompting the interolocutor for input.
The web dialog hooks up click and keyboard event handlers to choose options
and resumes the engine with an answer when the user chooses.
The command line dialog uses readline.

The engine drives the dialog with the `ask` method.
THe dialog calls back to the engine with the `answer` method.


## Renderers

A renderer accepts snippets of text and options and produces the narrative
for the interlocutor.

The engine drives the renderer by calling `write(lift, text, drop)`, `break()`,
`paragraph()`, `startJoin(lift, delimiter, conjunction)`, `stopJoin()`,
`delimit(delimiter)`, `option(number, label)`, `flush()`, `pardon()`,
`display()`, and `clear()`.
The renderer must collapse redundant calls to break and paragraph.
The `lift` and `drop` variables are either an empty string or a single space
depending on whether there must be whitespace around the text.
Different renderers may satisfy the whitespace requirement as they see fit, but
generally lifting space is ignored at the beginning of a paragraph or after a
break, dropped space is ignored at the end of a line, and interpolated space is
collapsed.
Two chunks of text are joined without space only if the prior drops nothing and
the next lifts none.


## The Web Dialog and Renderer

- document.js

The Kni document serves as both renderer and dialog controller.
The web dialog is relatively simple, building a DOM on the fly, with certain CSS
to allow the containing document to govern its position and animation.


## The Command Line Dialog Renderer

- readline.js
- console.js
- excerpt.js

The readline module just hooks up the Node.js readline to the engine.
The console module drives the creation of an excerpt for the narrative.
The excerpt is responsible for dealing with line wrapping and indentation
within a fixed width so the reader can scan paragraphs without awkward
terminal line wrapping.
