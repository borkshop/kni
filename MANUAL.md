# Kni Manual

The following is an undigestable reference because I don’t yet have time to
write a graduated tutorial.

Kni is a parser, compiler, and a runtime, all of which are accessible with
the `kni` command as installed by `npm`.

```
npm install kni
node_modules/.bin/kni --help
```

Be sure to use a project-local installation of `kni`.
While the language evolves, there are likely to be multiple radically different
major versions of this project in concurrent use.

By default, `kni` accepts one or more `.kni` files (see one of the many
examples) and opens up an interactive console for the story.
The `-j` command line flag bypasses the runtime and dumps the compiled JSON
state machine for the story.


## Text, space, and symbols

Stories consist of text and symbols.
Text appears in the generated narrative, and symbols provide instructions
to Kni.

Symbols include `>` on stand alone lines indicating a prompt instruction, `-`,
`*`, and `+` for bullets, sequences of dashes, `/`, `@`, ``->``, ``<-``, ``{``,
``|``, ``}``, for all other instructions.
Within an option, `[`, and `]` are also special.
The first non-space character after a curly brace may be a symbol.
These symbols include `%`, `~`, `$`, `@`, `#`, `$`, `?`, `!`, `>`, `<`, `<=`,
`>=`, `==`, and `!=`.
Furthermore, Kni reserves any character that is not a letter or number for
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

Kni is a white-space significant language.
All leading tabs and spaces, as well as bullet symbols, on a line contribute
determine the initial column number of the line.
Tabs advance the cursor to the next tab stop, which occur on every fourth
column.

Bullet symbols include `-`, `*`, and `+`.
Every time a line starts on a deeper column than the prior, it starts a new
thread that ends on the next line that starts on a shallower column.

```
* [You s[S]ay, {"Hello."} ]
  You are too kind, hello
  again to you too.
+ You s[S]ay, {"Farewell."}
>
```

The asterisk denotes an optional thread that the narrator will only propose
once.
The plus denotes a thread that the narrator will always propose.
The hyphen denotes a thread that is separated purely for organizational purposes.
All loose ends in options will be gathered and connected after the next prompt.

Within a thread, conditional jumps can optionally skip to the end of a thread.

```
- {door == open} The door is open.
  + [You w[W]alk through the open door. ] -> blue
```

Indented threads are useful for controlling the flow of the narrative.
The `*` and `+` bullets indicate an optional branch in the narrative,
and pose a choice for the interlocutor.
The `-` bullet is useful for separating a thread of narrative without
presenting an option.
Any thread can begin with a conditional expression.
Failing the condition, the narrative will skip the entire thread.

## Options

Kni will accumulate options until it encounters a prompt, depicted as
a right angle bracket, ``>``, alone on a line.
All loose ends from option branches will resume after the prompt unless
redirected elsewhere.

```
@blue

You are in a blue room.
There is a door.

@blue2

- {door} The door is open.
  + [You w[W]alk through the open door. ] -> red
  + [You c[C]lose the door. ]
    {=0 door} -> blue2
- {not door} The door is closed.
  + [You o[O]pen the door. ]
    {=1 door} -> blue2
+ [Where am I again?] -> blue
>

@red

You are in a red room.
There is a door and a bell.
```

## Formulae

Choices can also have conditions, components, and products.
The introduction to an option line may include any number of these.
An expression in braces serves as a condition, without which the option
is not available.

An expression with the plus `+` prefix denotes a product of the choice.
Chosing this option increases the variable.

An expression with the minus `-` prefix is a component that gets
consumed with the option. So, `{-2coal}` would indicate that the option
would consume two coal, but also indicates that the option is not available
unless the `coal` variable is at least two.

These primitives enable concise crafting formulae.

```
+ {at==smelter} {bellows} {-coal} {-lyme} {-iron} {+2steel}
  [You chose[Choose] to work the bellows, to convert coal, lyme, and iron to
  molten steel. ] The glowing metal emerges from the smelter.
```

## Questions and Answers

Options, starting with plus or asterisk, have a special notation and use the
additional symbols `[` and `]`.
The form of this notation denotes text that is part of the narrator’s answer,
question, and a part that is common to both.

```
+ [You saunter[Walk] out of the saloon. ]
```

Various patterns of brackets are suitable for threading bits of the question,
the answer, and threads that are common to both the question and answer.
This is a breakdown of the possibilities:

```
+ [Q] A
  Q: Q
  A: A
+ C []
  Q: C
  A: C
+ C [Q] A
  Q: C Q
  A: Q A
+ [[] C] A
  Q: C
  A: C A
+ [A1 [Q] C] A2
  Q: Q C
  A: A1 C A2
+ [A1 [Q1] C [Q2]] A2
  Q: Q1 C Q2
  A: A1 C A2
+ [A1 [Q1] C1 [Q2] C2] A2
  Q: Q1 C1 Q2 C2
  A: A1 C1 A2 A2
```

Examples:

```
# Ink style option
+ Hello [back!] right back to you!

# Abbreviated Ink style option
+ [North. ] You head north.

# Echo the question. The question is "Quit.", the answer is "Quit.".
+ [[] Quit. ]

# Second person variant illustrating inner bracket.
# [A    [Q] QA          ]
+ [You b[B]uy an arrow. ]

# Second person with alternating question-specific threads, and a trailing
# answer that continues from the question with alternate punctuation.
# [A    [Q] QA          [Q]] A
+ [You s[S]hoot an arrow[.]], scoring a {~hit|miss}!

# [Q     ] A
+ [Quit. ] <-
>
```

If an option has no question, it is a "non-option".
If the narrative reaches a prompt without accumulating any options,
it will fall through and automatically follow the first collected non-option.

```
* [An option only to be taken once. ]
* [Another option that disappears. ]
* [] When all other options have been exhausted,
  the remaining option, however invisible, must be chosen.
  <-
>
->start
```

## Keywords

Options can also have keywords. Any term in angle brackets, ``<term>``, denotes
a keyword name for an option.  With the command line (readline) engine, options
can be chosen by number or keyword.

```
+ <apple> [You chose[Choose] apple. ]
+ <orange> <lemon> [You chose[Choose] orange or lemon. ]
```

```
1.  Choose apple.
2.  Choose orange or lemon.
> lemon

You chose orange or lemon.
```

Invisible options can also be chosen by keyword.

```
+ <apple> [You chose[Choose] apple. ]
+ <orange> <lemon> [You chose[Choose] orange or lemon. ]
+ <grape> [] You chose a grape, which wasn'}t even on the menu.
```

```
1.  Choose apple.
2.  Choose orange or lemon.
> grape

You chose a grape, which wasn’t even on the menu.
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
+ [Try again!? ] ->start
+ [No, just finish. ]
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
@fruit {apple|banana|cherry}
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

Kni also support weighted random. Every thread in an alternation block has
a weight of 1 by default, meaning they are equally likely to be chosen.
An expression (in parentheses) at the beginning of each block can determine an
alternate weight.
In the following example, the coin toss is slightly biased for tails.

```
{~(2) heads |(3) tails }
```

The expression may contain variables and operators.
In the following example, the probability of choosing
"x" is initially 15:0, guaranteeing "x" as the first choice.
Then, we loop over that random alternation 30 times, each
time increasing the weight of the second thread.
On the last iteration of the loop, there is a 29:15 chance of choosing "y" over
"x".

```
@loop
{~(15)x|(n)y} /
{+n} {(n < 30)?-> loop}
```

Kni also supports "hypergeometric sampling", or rather "sampling without
replacement".
With the "^" prefix followed by an expression, you can determine the number
of threads to sample from the alternation.
Once a thread has been sampled, it is inelligible for the next sample, until
the number of samples or the number of threads has been exhausted.
Samples can also have weights.
If the weight of a thread is 0, it is inelligible for sampling.

In the next example, there are threads, each catering to a different sense.
Depending on the narrators perception of those senses, they may experience up
to two of these threads.

```
{^2
|(smell) You smell roses.
|(sight) The sky is bright blue.
|(hearing) You hear bees buzzing.
|(touch) The air feels cool on your skin.
}
```

Unordered random sampling makes possible many interesting procedural
narratives ideated by [Bruno Dias][] for Voyaguer.

[Bruno Dias]: http://www.gamasutra.com/blogs/BrunoDias/20160718/277314/Procedural_meaning_Pragmatic_procgen_in_Voyageur.php

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

### Conditions

By happy accident, switching on an expression can serve as a conditional
expression like `{(condition)|else|then}`. If the condition evaluates
to 0 (generally accepted as false), the block will express the "else" thread.
If the number is more than zero (any such value generally accepted as true),
the block will express the final "then" thread.
The following expression says "poor" if "gold" is zero, and "rich" if "gold" is
more than zero. Negative values are not accounted for.

```
{(gold == 0)| poor | rich }
```

This does not take into account negative numbers, the order is awkward,
and you must always express both the "then" and "else" threads.
A ternary conditional block solves both of these problems, and takes
the form `{(condition)?then}` or `{(condition)?then|else}`.
The following expression skips to the end if there is no gold.

```
{(not gold)? <-}
```

The following expression says "rich" or "poor" depending on whether there is
"gold".

```
{(gold)? rich | poor }
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
+ [You g[G]o east.] {+1 x}
+ [You g[G]o west.] {-1 x}
+ [You l[L]eave the forest.] <-
```

### Modify a variable

Modifiers all take a concise form: operator, value, variable.

```
- You win 10 gold. {+10 gold}
- You lose 10 gold. {-10 gold}
- However much gold you had before,
  you have 10 gold now. {=10 gold}
```

Kni also supports `*` and `/` for multiplying or dividing a variable in
place. The quantity is optional and defaults to 1.

```
- You gain an arrow. {+arrow}
```

### Expressions

Kni supports limited algebraic expressions.
Expressions may require parentheses to disambiguated precedence.
There are three tiers of precedence from tightly binding to loosely binding.
All of these operators produce 32 bit integers.
Logical operators return 0 or 1.

- unary `not`, `-`, `~`, `#`
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

`<>` is inequality.

`and` is logical intersection.

`or` is logical union.

unary `not` is logical negation.

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

Kni also supports a limited set of functions: `floor(x)`, `ceil(x)`,
`round(x)`, `abs(x)`, `acos(t)`, `asin(t)`, `atan2(x, y)`, `exp(x, y)`,
`log(x)` (natural log), `log(x, root)`, `max(n...)`, `min(n...)`, `pow(x, y)`,
`sin(t)`, `tan(t)`, `sign(x)`, `mean(n...)`, `root(x)` (square root), `root(x,
root)`, `distance(x1, y1, x2, y2)`, `manhattan(x1, y1, x2, y2)` (distance if
only travelling orthogonally to the x or y axes).

## Variables

Kni variable names can consist of words and dots.
Additionally, Kni supports interpolating expressions within variable names,
using braces.

```
{=10 x}
{=20 y}
{=1 point.{x}.{y}}
{(point.{x}.{y})}
```

## Options with Conditions and Consequences

This is a fragment of `examples/door-lock.kni`, which has two rooms with a
locked and closed door between them. Each option has conditions and
consequences.

```
+ {Open and Unlocked} [You w[W]alk through the open door. ] ->Red
+ {?Open} [You c[C]lose the door. ]
+ {Unlocked} {!Open} [You o[O]pen the door. ]
+ {not Open} {!Unlocked} [You u[U]nlock the door. ]
+ {not Open} {?Unlocked} [You l[L]ock the door. ]
```

There are five operators that have a combination of conditions and
consequences. "+", "-", "!", "?", and "=".

- The `{+n}` notation means "add one to n if this option is chosen".
- The `{+m n}` notation means "add m to n if this option is chosen".
- The `{-n}` notation means "subtract one from n if this option is chosen" and
  also "hide this option if n is zero or less".
- The `{-m n}` notation means "subtract m from n if this option is chosen" and
  also "hide this option if n is m or less".
- The `{!n}` notation means "set n to one if this option is chosen" and also
  "hide this option if n is already one".
- The `{?n}` notation means "set n to zero if this option is chosen" and also
  "hide this option if n is already zero".
- The `{=m n}` notation means "set n to m if this option is chosen" and also
  "hide this option if n is already m".
- Other expressions are merely conditions, like `{n <> m}` means "hide this
  option only if n is equal to m", or rather "show this option if n and m
  differ".

## Typographic Helpers

Kni scripts are UTF-8, but when you have to make do with ASCII, Kni
supports some operators that assist making common typographical niceties.

- ``{"`` and ``"}`` can stand for “curly quotes”.
- ``{'`` and ``'}`` can stand for the equivalent single ‘curly quotes’.
- ``--`` is good for an en-dash, suitable for use in number ranges like 1–10.
- ``---`` is good for em-dash—suitable for parenthetical phrases.

## Multiple Files

A Kni story can span multiple files. Pass all of these files to the `kni`
command and it will weave them into a single story.
Each file will begin with a label that is the name of the file, like `@archery`
for `path/to/archery.kni`. The story can start anywhere you put your `@start`
label, or in a file called `start.kni`.
