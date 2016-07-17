
# inkblot

Inkblot is an interactive dialog graph language inspired by [Ink] by Inkle,
intended for text adventures or interactive fiction.

[Ink]: https://github.com/inkle/ink

- [Differences from Ink][INKLINK]
- [The Ink Tutorial][TUTORIAL] that inspired Inkblot.
- [Reference Manual][MANUAL]
- [How to hack Inkblot][HACKINK]

[INKLINK]: INKLINK.md
[TUTORIAL]: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md
[MANUAL]: MANUAL.md
[HACKINK]: HACKINKG.md

Inkblots consist of descriptive text and options.
Inkblot runtime engines trace the dialog, entering at the top of the file and
exiting out the bottom.
The dialog accumulates options and presents a prompt for the interlocutor to
chose the direction of the narrative.

```
Hello, {"World!"}

@loop
+ [You s[S]ay, {"Hello."} ]
  You are too kind, hello
  again to you too. ->loop
+ [You s[S]ay, {"Farewell."} ]
>

The End.
```

To run an Inkblot, use the command-line interactive reader:

```
❯ inkblot hello.ink
Hello, "World!"
1. Say, "Hello".
2. Say, "Farewell."
> 1

You say, "Hello".
You are too kind, hello again to you too.
1. Say, "Hello".
2. Say, "Farewell."
> 2

You say, "Farewell."
The End.
```

Inkblot scripts can be loaded and bound with scenes in a web page.

- The [archery][] prototype illustrates a shop and gambling game.

- The [journey][] prototype illustrates a survival game over a
  procedurally-generated infinite road.

- The [airship][] prototype illustrates a narrative that includes
  a simulation of the control and behavior of a steampunk airship.

[archery]: http://archery.aelf.land
[journey]: http://journey.aelf.land
[airship]: http://airship.aelf.land

The command line tool can also:

- produce a transcript of a interpretation of the story.

  ```
  ❯ inkblot hello.ink -t hello.1
  ```

- verify that a transcript continues to produce the same narrative after
  alterations to the script. The Inkblot test suite uses this mechanism to
  validate itself against its examples and test scripts.

  ```
  ❯ inkblot hello.ink -v hello.1
  ```

- generate a JSON representation of the script. The JSON script can be embedded
  in a web application as a module and interpreted by the lightweight Inkblot
  engine.

  ```
  ❯ inkblot -j hello.ink
  ```

- interpret a script from precompiled JSON.

  ```
  ❯ inkblot -J hello.json
  ```

- Inkblot can also produce a diagnostique view of a story. The first column is
  the thread label, then the instruction type, a description of the
  instruction, and an indicator for the next thread. In the absense of an
  indicator, the engine proceeds to the next instruction. A forward arrow
  indicates a jump and a backward arrow indicates a return to a calling thread,
  a processsion to the next thread of a question or answer sequence, or an
  exit.

  ```
  ❯ inkblot hello.ink -d
  start     text    -Hello, “World!”
  loop      option  (Q loop.0.2 loop.0.3) (A loop.0.1 loop.0.3 loop.0.4)  -> loop.1
  loop.0.1  text    -You s-                                               <-
  loop.0.2  text    -S-                                                   <-
  loop.0.3  text    -ay, “Hello.”                                         <-
  loop.0.4  text    You are too kind, hello again                         -> loop
  loop.1    option  (Q loop.1.2 loop.1.3) (A loop.1.1 loop.1.3 loop.1.4)  -> loop.2
  loop.1.1  text    -You s-                                               <-
  loop.1.2  text    -S-                                                   <-
  loop.1.3  text    -ay, “Farewell.”                                      <-
  loop.1.4  goto                                                          -> loop.3
  loop.2    prompt
  loop.3    text    -The End.
  ```

