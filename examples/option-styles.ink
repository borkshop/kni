# Inkblot supports a superset of Ink's option styles for the sake of second
# person narrative that weaves threads that are alternately used for the
# "question", "answer", or both. In the following notation, "Q" refers to a
# thread that will only appear in the question, "A" to a thread that will only
# appear in the answer, and "QA" for a thread that will appear in both.
# Regardless of whether the option is read for the question or answer, all of
# the threads are woven in order.
#
# Every option requires at least one bracketed expression. As a general rule,
# the entire question ends at the last closed bracket, "]".
#
# These are a sample of the supported forms:
#
# + [Q] A
# + QA []
# + QA [Q] A
# + [A1 [Q] QA] A2
# + [A1 [Q1] QA [Q2]] A2
# + [A1 [Q1] QA1 [Q2] QA2] A2
#
# These are concrete examples of each form:

# Ink style option
+ Hello [back!] right back to you!

# Abbreviated Ink style option
+ [North. ] You head north.

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

->start
