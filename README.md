
# kni

> We are the Knights Who Write Kni.
> Our first letters are all silent.
> Our final letters are however unbearably loud.

Kni is an interactive story language for multiple-choice text adventures,
interactive fiction, and phone bots. Press [1][] for adventure.

The name is an homage (also silent) to Inkle’s [Ink][] (the same, but
backwards) and to Monty Python, and like other languages namèd thusly,
Kni alsø has significant whitespace.

[Ink]: https://github.com/inkle/ink
[1]: http://journey.aelf.land

- [Differences between Ink and Kni][INKKNI]
- [The Ink Tutorial][TUTORIAL] that inspired Kni.
- [Language Reference Manual][MANUAL]
- [How to hack Kni][HACKNI]

[INKKNI]: INKKNI.md
[TUTORIAL]: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md
[MANUAL]: MANUAL.md
[HACKNI]: HACKNI.md

Use npm to install and run kni. The kni command line requires Node.js version 4
or greater.

```
$ nvm use 4
$ npm install kni
$ PATH=$(pwd)/node_modules/.bin:$PATH
$ kni
```

Kni stories consist of descriptive text and options.
Kni runtime engines trace the dialog, entering at the top of the file and
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

To run an Kni, use the command-line interactive reader:

```
$ kni hello.kni
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

Kni scripts can be loaded and bound with scenes in a web page.

```
$ kni hello.kni --html hello.html
$ open hello.html
```

- [Peruácru][peruacru] is an app for iOS and Android using Apache Cordova.
  A [slice](https://github.com/kriskowal/peruacru.then.land) of the game is open source for illustration.

  [![Peruácru Icon](https://github.com/kriskowal/kni/raw/master/examples/peruacru.png)][peruacru]

- The [archery][] prototype illustrates a shop and gambling game.

  [![An Archery Shop](https://github.com/kriskowal/kni/raw/master/examples/archery.png)][archery]

- The [journey][] prototype illustrates a survival game over a
  procedurally-generated infinite road.

  [![A Journey through Ælfland](https://github.com/kriskowal/kni/raw/master/examples/journey.png)][journey]

- The [airship][] prototype illustrates a narrative that includes
  a simulation of the control and behavior of a steampunk airship.

[peruacru]: http://peruacru.then.land
[archery]: http://archery.aelf.land
[journey]: http://journey.aelf.land
[airship]: http://airship.aelf.land

The command line tool can also:

- produce a transcript of a interpretation of the story.

  ```
  $ kni hello.kni -t hello.1
  ```

- verify that a transcript continues to produce the same narrative after
  alterations to the script. The Kni test suite uses this mechanism to
  validate itself against its examples and test scripts.

  ```
  $ kni hello.kni -v hello.1
  ```

- generate a JSON representation of the script. The JSON script can be embedded
  in a web application as a module and interpreted by the lightweight Kni
  engine.

  ```
  $ kni -j hello.kni
  ```

- interpret a script from precompiled JSON.

  ```
  $ kni -J hello.json
  ```

- Kni can also produce a diagnostique view of a story. The first column is
  the thread label, then the instruction type, a description of the
  instruction, and an indicator for the next thread. In the absense of an
  indicator, the engine proceeds to the next instruction. A forward arrow
  indicates a jump and a backward arrow indicates a return to a calling thread,
  a processsion to the next thread of a question or answer sequence, or an
  exit.

  ```
  $ kni hello.kni -d
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

---

DON’T PANIC

Copyright © 2016 by Kristopher Kowal.
All rights reserved.
