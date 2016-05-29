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

Symbols include: `-`, `*`, `+`, `/`, `=`, ``->``, ``<-``, ``{``, ``|``, ``}``,
and ``>``.
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
```

The asterisk denotes an optional thread that the narrator will only propose
once.
The plus denotes a thread that the narrator will always propose.
The hyphen denotes a thread that is separated purely for organizational purposes.
All loose ends in the subthread will be gathered and flow into the next sibling
of the parent thread, ,skipping any subsequent siblings.

Within a thread, conditional jumps can optionally skip to the end of a thread.

```
- {!arrows} {!gold} <-
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

The Inkblot runtime will infer when it needs to present a prompt to the
interlocutor.
Since options can be collected by traversing multiple optional subthreads, the
runtime waits until the narrative resumes.
It will then pause and present its questions.

Note in the following excerpt, there are two groups of options, and a final
option that is always presented, “Where am I again?”.
The runtime collects all of these options and does not present a prompt
until it encounters the text for the red room, indicating that a choice must be
made before the narrative can continue.


```
= blue

You are in a blue room.
There is a door.

- {?door} The door is open.
  + You w[W]alk through the open door. -> red
  + You c[C]lose the door.
    - {=0 door} -> blue
- {!door} The door is closed.
  + You o[O]pen the door.
    - {=1 door} -> blue
+ Where am I again? -> blue

= red

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
  again to you too. -> loop
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

## Goto

The forward arrow ``->`` followed by a label sends the narrative to another
part of the story.
The return arrow ``<-`` exits goes to the end.
Every narrative implicitly starts with the `start` label.

```
{Three... |Two.. |One. |Liftoff! <-} /
-> start
```

## Labels

A story is a collection of transitions.
Each of those transitions has a name.
The first transition is implicitly called `start`.
Its first child is called `start.0.1` and its first sibling is called `start.1`.
To be able to go to other transitions, they must have labels.

A label is the symbol `=` followed by a name, appearing anywhere in a
narrative.
The following song begins with a `refrain`, to which we repeatedly return until
the song exhausts itself or the interlocutor.

```
{=99 bottles}
= refrain
{#bottles||1 bottle|{$bottles} bottles} of beer on the wall. /
{#bottles||1 bottle|{$bottles} bottles} of beer. /
You take one down and pass it around. {-1 bottles} /
{#bottles|No more bottles|1 bottle|{$bottles} bottles} of beer on the wall. /
{#bottles||->refrain}
```

## Calling a procedure

```
- =greet(time)
  {$time|Hello|Good bye}, World!

{-> greet {=0 time}}
{-> greet {=1 time}}
```

## Returning or exiting

The reverse arrow will skip to the end of a procedure.
For the main narrative, this means exiting out the bottom of the file.
Within a procedure, this means exiting out the end of the procedure,
popping the stack, and proceeding from where the procedure was called.

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
+ Tired of cheeries. {=0 fruit}
```

### Loops

```
When you emerge, {%day|night} greets you, with the {%sun|moon} overhead.
```

### Random

```
You flip a coin. {~Heads|Tails}!
```

```
This is a coin toss.

+ You c[C]all heads. {=0 expected}
+ You c[C]all tails. {=1 expected}

You flip the coin. It lands on
{~heads{=0 actual}|tails{=1 actual}}.

You {$expected|
{$actual|win|lose}|
{$actual|lose|win}}.
```

### Echo a variable

The narrator can read variables directly.

```
You have {$gold} gold.
```

### Switch on variable

Providing any number of bar delimited threads after a variable
indicates that the narrator should chose a thread based on the value of the
variable, starting with 0.
As with sequences above, the narrator falls back to the final thread for all
values greater than the number of available threads.
A variable switch does not implicitly increment the variable.

```
You have {$gold|no|some} gold.
```

### Loop over variable

Using the at `@`, the narrator will draw a *circle around a* sequence,
using modulo to wrap the variable around the available number of threads.

```
Today is {@day|Mon|Tues|Wednes|Thurs|Fri|Sat|Sun}day.
```

A variable loop does not implicitly modify the variable.

### Arbitrary switch for variable

The following example is a random forest.
Walking east and west takes you to a new location in the forest with a
procedurally generated description.
Each place in the forest has an arbitrary, but not random, tree.

```
There is an {#x|an ash|an oak|a birch|a yew} here.
+ You g[G]o east. {+1 x} -> start
+ You g[G]o west. {-1 x} -> start
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

Inkblot reserves the right to add an infix notation for multivariate
expressions someday, and will not try to cobble algebra into this form.

### Check a variable

```
- {?gold} You have some gold.
- {!gold} You have no gold.
- {>10 gold} You have more than 10 gold pieces.
- {>=10 gold} You have 10 or more gold pieces.
- {<10 gold} You have less than 10 gold pieces.
- {<=10 gold} You have 10 or less gold pieces.
- {==10 gold} You have exactly 10 gold pieces.
- {!=10 gold} You do not have exactly 10 gold pieces.
```
