
# inkblot

Inkblot is an interactive dialog graph language inspired by [Ink] by Inkle,
intended for text adventures or interactive fiction.

[Ink]: https://github.com/inkle/ink

Inkblots consist of descriptive text and options.
Inkblot runtime engines trace the dialog, entering at the top of the file and
exiting out the bottom.
The dialog accumulates options and presents a prompt for the interlocutor to
chose the direction of the narrative.

```
Hello, "World!"

@loop
+ You s[S]ay, "Hello". /
  You are too kind, hello
  again to you too. ->loop
+ You s[S]ay, "Farewell."
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

The command line tool can also generate the intermediate JSON representation of
a dialog graph, suitable for use with alternate inkblot readers.

```
❯ inkblot -j hello.ink
{
    "start": {
        "type": "text",
        "text": "Hello, \"World!\"",
        "lift": "",
        "drop": " ",
        "next": "loop"
    },
    "loop": {
        "type": "option",
        "label": "Say, \"Hello\".",
        "keywords": [],
        "branch": "loop.0.1",
        "next": "loop.1"
    },
    "loop.0.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "loop.0.2"
    },
    "loop.0.2": {
        "type": "text",
        "text": "ay, \"Hello\".",
        "lift": "",
        "drop": " ",
        "next": "loop.0.3"
    },
    "loop.0.3": {
        "type": "text",
        "text": "You are too kind, hello again to you too.",
        "lift": " ",
        "drop": " ",
        "next": "loop"
    },
    "loop.1": {
        "type": "option",
        "label": "Say, \"Farewell.\"",
        "keywords": [],
        "branch": "loop.1.1",
        "next": "loop.2"
    },
    "loop.1.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "loop.1.2"
    },
    "loop.1.2": {
        "type": "text",
        "text": "ay, \"Farewell.\"",
        "lift": "",
        "drop": " ",
        "next": "loop.3"
    },
    "loop.2": {
        "type": "prompt"
    },
    "loop.3": {
        "type": "text",
        "text": "The End.",
        "lift": "",
        "drop": " ",
        "next": null
    }
}
```

Inkblot can also produce a diagnostique view of a story.

```
❯ inkblot hello.ink -d
start     text    -Hello, "World!"                loop
loop      option  Say, "Hello". -> loop.0.1       loop.1
loop.0.1  text    -You s-                         loop.0.2
loop.0.2  text    -ay, "Hello".                   loop.0.3
loop.0.3  text    You are too kind, hello again   loop
loop.1    option  Say, "Farewell." -> loop.1.1    loop.2
loop.1.1  text    -You s-                         loop.1.2
loop.1.2  text    -ay, "Farewell."                loop.3
loop.2    prompt
loop.3    text    -The End.
```

It can also record a transcript with `-t`, or verify a prior recorded
transcript with `-v`.
