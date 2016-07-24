# Inkblot Manual

The following is an undigestable reference because I don’t yet have time to
write a graduated tutorial.

Inkblot is a parser, compiler, and a runtime, all of which are accessible with
the `inkblot` command as installed by `npm`.

```
npm i -S inkblot
PATH=$PATH:node_modules/.bin
inkblot --help
```

Be sure to use a project-local installation of inkblot.
While the language evolves, there are likely to be multiple radically different
major versions of this project in concurrent use.

By default, `inkblot` accepts a `.ink` file (see one of the many examples)
and opens up an interactive console for the story.
The `-j` command line flag bypasses the runtime and dumps the compiled JSON
state machine for the story.


## Text, space, and symbols

Stories consist of text and symbols.
Text appears in the generated narrative, and symbols provide instructions
to Inkblot.

Symbols include `>` on stand alone lines indicating a prompt instruction, `-`,
`*`, and `+` for bullets, sequences of dashes, `/`, `@`, ``->``, ``<-``, ``{``,
``|``, ``}``, for all other instructions.
Within an option, `[`, and `]` are also special.
The first non-space character after a curly brace may be a symbol.
These symbols include `%`, `~`, `$`, `@`, `#`, `$`, `?`, `!`, `>`, `<`, `<=`,
`>=`, `==`, and `!=`.
Furthermore, Inkblot reserves any character that is not a letter or number for
special use in that position.

Any number of spaces or newlines between are equivalent to a single space in
the generated narrative.


## Collapsed space

For any two pieces of text, if there is any white space between the first text
and the next symbol, or if there is any white space before the second
text and the previous symbol, those pieces of text will be separated by
white space in the generated narrative.

The following lines are equivalent:

```
Hello, {Alice|Bob|Charlie}!
Hello,{ Alice| Bob| Charlie}!
Hello, { Alice| Bob| Charlie}!
```

You can use space around symbols to govern whether a space should exist from
either side of adjacent text.

```
Hyper{-drive| space}.
```

The narrative may use either a space or a newline as appropriate for any of
these spaces.

It is possible to use curly braces to concatenate long words across lines, for
example, the longest known word in the German language.

```
Was bedeudet, „Rindfleische{
}tikettierungsueberwachungs{
}aufgabenuebertragungsgesetz?”
```

## Indentation and threads

Inkblot is a white-space significant language.
All leading tabs and spaces, as well as bullet symbols, on a line contribute
determine the initial column number of the line.
Tabs advance the cursor to the next tab stop, which occur on every fourth
column.

Bullet symbols include `-`, `*`, and `+`.
Every time a line starts on a deeper column than the prior, it starts a new
thread ends ends on the next line that starts on a shallower column.

```
* You s[S]ay, “Hello”.
  - You are too kind, hello
    again to you too.
+ You s[S]ay, “Farewell.”
>
```

The asterisk denotes an optional thread that the narrator will only propose
once.
The plus denotes a thread that the narrator will always propose.
The hyphen denotes a thread that is separated purely for organizational purposes.
All loose ends in the subthread will be gathered and flow into the next sibling
of the parent thread, skipping any subsequent siblings.

Within a thread, conditional jumps can optionally skip to the end of a thread.

```
- {!arrows or !gold} <-
You still have either gold or arrows!
```

Indented threads are useful for controlling the flow of the narrative.
The `*` and `+` bullets indicate an optional branch in the narrative,
and pose a choice for the interlocutor.
The `-` bullet is useful for separating a thread of narrative without
presenting an option.
These threads of the narrative can include conditional jumps that skip to the
end of the thread, or isolate procedures that implicitly exit when the thread
ends.

## Options

Inkblot will accumulate options until it encounters a prompt, depicted as
a right angle bracket, ``>``, alone on a line.
All loose ends from option branches will resume after the prompt unless
redirected elsewhere.

```
@blue

You are in a blue room.
There is a door.

- {?door} The door is open.
  + You w[W]alk through the open door.
  + You c[C]lose the door.
    - {=0 door} ->blue
- {!door} The door is closed.
  + You o[O]pen the door.
    - {=1 door} ->blue
+ Where am I again? ->blue
>

@red

You are in a red room.
There is a door and a bell.
```

## Questions and Answers

Options, starting with plus or asterisk, have a special notation and use the
additional symbols `[` and `]`.
The form of this notation denotes text that is part of the narrator’s answer,
question, and a part that is common to both.

```
+ You saunter[Walk] out of the saloon.
```

In general, this is the form:

```
+ Answer[Question]Common
```

An option can consist exclusively of text common to the question and answer by
omitting the brackets.
Often, the answer will restate most of the question, so the question block
reduces to differences in case and punctuation.

Inverting the brackets swaps the sides that the answer and common text appear.

```
+ Common]Question[Answer
```

```
+ You reply, []“I could not possibly eat another bite.”
+ “I could not possibly have another bite].”[,” you reply.
```

Regardless, an option implicitly terminates with the first directive, or
explicitly with the solidus.

```
+ You s[S]ay, “Hello”. /
  You are too kind, hello
  again to you too. ->loop
```


# Directives

A limited number of symbols are significant within a narrative outside braces
and bullets for common control directives.

## Solidus

The solidus indicates a line break, suitable for breaking lines in poetry, but
not paragraphs.

```
Roses are red /
Violets are blue
```

## Paragraph

A double solidus indicates that the narrative should have a break between
paragraphs.

```
And they lived merrily for ever after. //
The end.
```

This renders as:

```
And they lived merrily for ever after.

The end.
```

The explicit marker is useful for distinguishing cases where
the text might not be necessarily separated by a paragraph.

```
And they lived mellowly for ever after. //
+ Try again!? ->start
+ No, just finish.
The end.
```

## Goto

The forward arrow ``->`` followed by a label sends the narrative to another
part of the story.
The return arrow ``<-`` exits goes to the end.
Every narrative implicitly starts with the `start` label.

```
{Three... |Two.. |One. |Liftoff! <-} /
->start
```

## Labels

A story is a collection of transitions.
Each of those transitions has a name.
The first transition is implicitly called `start`.
Its first child is called `start.0.1` and its first sibling is called `start.1`.
To be able to go to other transitions, they must have labels.

A label is the symbol `@` followed by a name, appearing anywhere in a
narrative.
The following song begins with a `refrain`, to which we repeatedly return until
the song exhausts itself or the interlocutor.

```
! bottle = 99
@refrain
{(bottle)||1 bottle|{(bottle)} bottles} of beer on the wall. /
{(bottle)||1 bottle|{(bottle)} bottles} of beer. /
You take one down and pass it around. {-bottle} /
{(bottle)|No more bottles|1 bottle|{(bottle)} bottles} of beer on the wall. //
{(bottle)||->refrain}
```

## Calling a procedure

A procedure is a label that can be called and returned from.
Procedures can be used as goto targets, but with the special syntax for calling
a procedure, they can introduce a scope with local variables and
return to the next transition after where they were called.
The procedure implicitly returns at the end of the thread.

```
- @greet(time)
  {(time)|Hello|Good bye}, World!

->greet(0)
->greet(1)
```

A label followed by parenthesized and comma separated argument expressions
signifies a call and return, instead of just going to a label.
These arguments are evaluated in the caller scope, then applied to parameters
in the callee scope.

## Returning or exiting

In the above example, the greet procedure impicitly returns at the end of the thread.
The reverse arrow will skip to the end of a procedure.
For the main narrative, this means exiting out the bottom of the file.
Within a procedure, this means exiting out the end of the procedure.
Regardless, the reverse arrow pops the stack and proceeds after the call site,
or ends the narrative.

```
<-
```

# Blocks

All remaining special syntax is the purview of blocks, instructions between
braces `{` and `}`, often delimited with vertical bars, `|`.

## Sequences

A narrative can contain a sequence of threads.
Each time we visit a sequence, we see the next thread.
Once all of the threads have been exhausted, we see
the last thread every subsequent time.

```
{apple|banana|cherry}
```

The final thread may be empty if the sequence should disappear once it has been
exhausted.

```
{There are two fish in the pond.|
A cat rests by the pond.|}
```

Behind the scenes, the sequence has a variable with the same name as the
transition within the story.
This name can be determined with a label.

```
=fruit {apple|banana|cherry}
```

Each time we visit the sequence, the narrator increments the `fruit` variable,
even after the threads have been exhausted and we see only the final thread.
The story can read or modify this variable.

```
+ Tired of cherries. {=0 fruit}
```

### Loops

```
When you emerge, {&day|night} greets you, with the {&sun|moon} overhead.
```

### Random

```
You flip a coin. {~Heads|Tails}!
```

This example uses the corresponding `~` expression to
choose either 0 or 1 (2 options).

```
! heads = 0
  tails = 1

This is a coin toss.

+ [You c[C]all heads. ] {=heads called}
+ [You c[C]all tails. ] {=tails called}
>

You flip the coin.
{= ~2 flipped}
It lands on {(flipped)|heads|tails}.

You {(called == flipped)|lose|win}.
```

### Echo a variable

The narrator can read variables directly.

```
You have {(gold)} gold.
```

### Switch on variable

Providing any number of bar delimited threads after a variable indicates that
the narrator should chose a thread based on the value of the variable,
starting with 0.
As with sequences above, the narrator falls back to the final thread for all
values greater than the number of available threads.
That is, if the variable is greater than the number of alternatives, it chooses
the final alternative.
If the variable is less than zero, it chooses the first alternative.
A variable switch does not implicitly increment the variable.

```
You have {(gold)|no|some} gold.
```

### Loop over variable

Using the at `@`, the narrator will draw a *circle around a* sequence,
using a proper mathematical modulo to wrap the variable around the available
number of threads.
If the value exceeds the number of options, it wraps around.

```
Today is {@day|Mon|Tues|Wednes|Thurs|Fri|Sat|Sun}day.
```

Also, if the number is -1, it will choose the final alternative, -2 chooses the
penultimate, ad nauseaum. The following example indicates the sign of a variable,
taking advantage of negative wrapping.

```
-1 is {@sign(-1)|neutral|positive|negative} /
```

A variable loop does not implicitly modify the variable.

### Arbitrary switch for variable

The following example is a random forest.
Walking east and west takes you to a new location in the forest with a
procedurally generated description.
Each place in the forest has an arbitrary, but not random, tree.

```
There is an {#x|an ash|an oak|a birch|a yew} here.
+ You g[G]o east. {+1 x} ->start
+ You g[G]o west. {-1 x} ->start
+ You l[L]eave the forest.
```

### Modify a variable

Modifiers all take a concise form: operator, value, variable.

```
- You win 10 gold. {+10 gold}
- You lose 10 gold. {-10 gold}
- However much gold you had before,
  you have 10 gold now. {=10 gold}
```

### Check a variable

Checking a variable will jump to the end of a scope if that variable is zero.
This is a handy use for the `-` block, which serves only as an organizational
indent and allows these expressions to jump.

```
- {?gold} You have some gold.
```

### Conditions

Instead of jumping to the end of the current thread, a condition can choose
from either a then or else thread with `{?expression|then|else}` notation.
The following expression skips to the end if there is no gold.

```
{?not gold|<-}
```

The following expression says red or blue depending on whether the variable is
positive.

```
{(team > 0)| red | blue }
```

### Expressions

Inkblot supports limited algebraic expressions.
Expressions may require parentheses to disambiguated precedence.
There are three tiers of precedence from tightly binding to loosely binding.
All of these operators produce 32 bit integers.
Logical operators return 0 or 1.

- unary `!`, `-`, `~`, `#`
- `*`, `/`, `%`, `~`
- `+`, `-`
- ``<``, ``<=``, `==`, `!=`, `>=`, `>`, `#`.
- `and`
- `or`

`*` is multiplication.

`/` is division.

`%` is modulo.

`+` is addition.

`-` is subtraction.

`<` is less-than.

`>` is greater-than.

`<=` is less-than-or-equal-to.

`>=` is greater-than-or-equal-to.

`==` is equality.

`!=` is inequality.

`and` is logical intersection.

`or` is logical union.

unary `!` is logical negation.

unary `-` is negative.

unary `~` produces a random variable from 0 to less than the operand.

unary `#` is a hash, consistently producing the same ostensibly random number
for the operand.

binary `~` is a random variable. In `x~y`, X is the number of samples and `Y` is the
upper bound of the random variable for each sample. As such,
`2~6` produces a random variable in the half open interval of [0, 12) with a
mean value of 6, where 6 is the most likely variable, with diminishing
probability toward 0 and 12. The D&D expression `2d6` is equivalent to
`1~6 + 1~6 + 2` owing to the vagaries of math.

I haven’t implemented simplified notation for die rolls, favoring the ~
operator initially because it composes better mathematically.

binary `#` produces the equivalent point on a Hilbert Curve for a coordinate X, Y.
This, in combination with `#` consistent hash blocks, is handy for generating
arbitrary but consistent content in a two-dimensional plane without
accidental symmetry over any axis.  For example `{#x+y}` creates symmetry
along a diagonal. `{#x*y}` produces symmetry across multiple axes about the
origin.  The Hilbert operator presumes a space with 4 billion unique
coordinates in a square of height and width 64k centered about the origin.

## Variables

Inkblot variable names can consist of words and dots.
Additionally, Inkblot supports interpolating expressions within variable names,
using braces.

```
{=10 x}
{=20 y}
{=1 point.{x}.{y}}
{(point.{x}.{y})}
```

## Typographic Helpers

Inkblot scripts are UTF-8, but when you have to make do with ASCII, Inkblot
supports some operators that assist making common typographical niceties.

- ``{"`` and ``"}`` can stand for “curly quotes”.
- ``{'`` and ``'}`` can stand for the equivalent single ‘curly quotes’.
- ``--`` is good for an en-dash, suitable for use in number ranges like 1–10.
- ``---`` is good for em-dash—suitable for parenthetical phrases.

