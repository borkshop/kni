
# Differences with Inkle’s Ink

Inkblot is an homage, inspired by Inkle’s Ink.
The languages have several key ideas in common.

- They h[H]ave pithy notation for question/answer narrative for options.
- They have {curly|braces|delimited|by|pipes} for meta-narrative.
- They have the divert or goto arrow ``->``.
- They collect threads of narrative after nested option groups.
- They both generate a JSON artifact that separates their parser from their
  runtime.

Inkblot diverges rapidly from its roots in inspiration from Inkle’s Ink.

- Superficially, Inkblot is entirely implemented in JavaScript, so you can run
  every part of it in the browser or on a server.

- Inkblot is a significant-whitespace language.
  Consequently, threads only need one bullet per line and their parentage and
  children are inferred from indentation.

- Inkblot does not have the `<>` operator for joining lines.
  Instead, Inkblot allows lines to wrap and requires an express solidus ``/``
  for line breaks or horizontal rule ``---`` for paragraph breaks.

- Inkblot does not have `=== title ===` notation and does not infer the `title.` prefix
  for `= subtitle` markers. Inkblot only has `@label` notation which must state
  the fully qualified label.

- Inkblot requires explicit prompting with the ``>`` marker.
  Early versions of Inkblot experimented with inferring the location of the marker,
  but the inferrence system did not play well with conditional threads
  that collect options, loops, or variable changes, and won’t play well
  with subroutines that collect options.

  ```ink
  + Apples
  + Oranges
  >

  + Umbrellas
  + Parasols
  >
  ```

  Ink appears to require all options to appear on the same level, and supports
  conditions directly on options. That probably accounts for how it gets
  by with implicitly prompting at the end of an option list.

- Ink favors first person options.

  ```ink
  *   Hello [back!] right back to you!
  ```

  Which can be expressed with inverted backets in Inkblot.

  ```inkblot
  * Hello ]back![ right back to you!
  ```

  But Inkblot favors second person.

  ```inkblot
  * You s[S]ay, “Hello back!” /
    They say, hello right back to you.
  ```

  So in Ink, a dialog like the following,

  ```ink
  *   “I am somewhat tired[.”],” I repeated.
      “Really,” he responded. “How deleterious.”
  ```

  Needs two perhaps odd changes.
  First, the brackets need to be inverted.
  Then you have to add the solidus indicating
  the end of the portion that appears in the label.
  With Inkle’s Ink, the closing bracket is sufficient
  since everything that follows only appears in the
  reply and can’t be wrapped to the next line.

  ```inkblot
  *   “I am somewhat tired].”[,” I repeated. /
      “Really,” he responded. “How deleterious.”
  ```

- Inkblot’s {variable|text} is similar but not the same as Inkle’s Ink.

  - The default is the same ``{a|b|c}``, choosing "a", then "b", then "c" every
    time thereafter, always incrementing a variable with the same name as the
    underlying instruction label.

  - Cycles are marked with ``{%a|b|c}`` instead of ``{&a|b|c}``.

  - Once only lists don’t have a special marker, but you can leave the final
    variant empty like ``{a|b|c|}`` instead of ``{!a|b|c}``

  - Shuffles are the same, ``{~heads|tails}``.

  - Printing the value of a variable uses ``{$variable}`` notation instead of
    merely ``{variable}``.

  - Inkblot also supports variable backed lists ``{$variable|a|b|c}``, which
    like the default list stick on the last variant, and loops
    ``{@variable|a|b|c}``, which walk around the list.
    Inkblot has deterministic but arbitrary choices using the hash as well
    ``{#variable|a|b|c}``.

  - Inkblot’s conditional notation is like ``{?condition|then|else}`` instead
    of ``{condition: then}``, and works for comparison operators like ``{>10
    health| very much alive| hurting}`` and abbreviated negation like
    ``{!condition|then}``.
    By omitting the then and else clauses, a condition can apply, skipping
    to the end of the current thread.

- Inkblot does not yet use `~` bulleted lines for mutation and logic.  Instead,
  there are blocks that modify state like ``{+gold}`` and ``{=10 hearts}`` that
  can be applied inline with narrative.

- Inkblot’s algebraic expressions vary in many small ways, like `!` instead of
  `not`.

- The compiled JSON and the virtual machine that runs it are entirely
  different.

Inkblot is missing many things available to Ink.

- Inkblot does not have enumerations or other typed variable declarations.
  In only supports 32 bit integers.

- Labels are not variables. You can’t write a label to a variable and divert to
  it by that variable name.

- Inkblot does not yet support modules.

- Inkblot does not support functions for expressions.

- Inkblot does not support calling out to game logic. This is not likely to
  change. Games should bind to Ink narrative by watching the variable bag.

- Inkblot does not yet support conditions directly on options.
  For the nonce, you have to nest options in threads.

  ```inkblot
  - {?seen.clue}
    + Accuse Mr.\ Jefferson.
  ```

Yet Inkblot has some features that Ink leaves out.
Ink’s smallness is a virtue for keeping the language easy to pick up for
non-programmers, whereas I’ve made Inkblot selfishly as a hybrid writer and
coder.

- Inkblot can collect options through nested conditional threads.

- Inkblot has subroutines. The ``{->label}`` is instructs the engine both to go
  to label, but also to return here after exhausting that narrative.

- Inkblot uses a ``<-`` operator to terminate a narrative (and return to the
  calling narrative if there is one) instead of goto with a special label, like
  Ink’s ``-> END``.

- Inkblot has operators for biased random numbers, hilbert curves, and hashing
  that suit it for gambling games and deterministic procedurally generated
  narrative.

All of this is subject to change from major version to major version.
I’m rapidly leaving major versions behind, so the stories written for them will
continue to work, but the language continues to evolve.
