# How to Write Kni

This tutorial will guide you from your first interactive story to crafting
complex narratives with branching paths, variables, and conditional options.
By the end, you'll be able to write stories that remember choices, track
inventory, and unlock new paths based on the reader's decisions.

## Getting Started

Install Kni with npm:

```
npm install kni
```

Create a file called `hello.kni`:

```
Hello, World!
```

Run it:

```
npx kni hello.kni
```

You'll see "Hello, World!" and the story ends. Not very interactive yet.


## Making a Stand-Alone Web Page

You can turn any Kni story into a self-contained HTML page:

```
npx kni hello.kni --html hello.html
```

Open `hello.html` in a browser and you have a playable story. Customize it with
flags:

```
npx kni story.kni --html story.html --html-title "My Adventure" --html-background-color "#1a1a2e"
```

This is the quickest way to share your stories—just send someone the HTML file.


## Your First Choice

A story becomes interactive when it offers choices. Add options with `+` and
end the choice with a prompt `>`:

```
You stand at a crossroads.

+ [Go left. ]
  The path leads to a meadow.
+ [Go right. ]
  The path leads to a forest.
>

Your journey continues.
```

Run this and you'll see:

```
You stand at a crossroads.
1. Go left.
2. Go right.
>
```

Type `1` or `2` to choose. After choosing, the story continues to "Your journey
continues."


## How Options Work

Each option starts with `+` and its text goes in brackets `[...]`. Everything
indented under the option happens when it's chosen:

```
+ [Pet the cat. ]
  The cat purrs contentedly.
+ [Ignore the cat. ]
  The cat glares at you.
>
```

The indentation matters. Kni uses whitespace to know what belongs to each
option.


## Making Choices Disappear

Use `*` instead of `+` for options that disappear after being chosen:

```
@start

* [Open the mysterious box. ]
  Inside you find a golden key!
+ [Look around. ]
  The room is dusty and old.
>

->start
```

The first time through, you can open the box. After that, only "Look around"
remains. The `->start` sends the story back to the beginning to loop.


## Labels and Jumping

Use `@label` to mark a spot in your story, and `->label` to jump there:

```
@kitchen

You are in a kitchen.

+ [Go to the garden. ] ->garden
+ [Stay here. ]
>

The kettle whistles.

@garden

You are in a sunny garden.

+ [Go to the kitchen. ] ->kitchen
+ [Sit on the bench. ]
>

You enjoy the warmth.
```

Now you have two connected locations!


## Ending the Story

Use `<-` to end the story (or return from a procedure, which we'll cover
later):

```
+ [Continue your adventure. ]
+ [Quit. ] <-
>

The adventure continues!
```


## Remembering Things with Variables

Stories become interesting when they remember what happened. Set a variable
with `{=value variable}`:

```
You find a rusty key.
{=1 hasKey}

+ [Try the locked door. ]
  {(hasKey)? The key fits! The door swings open.
  | The door is locked. You need a key.}
>
```

The `{(hasKey)? then | else }` syntax checks the variable. If `hasKey` is
non-zero (true), it shows "The key fits!" Otherwise, it shows the locked
message.


## Showing Variable Values

Display a variable's value with `{(variable)}`:

```
! gold = 10

You have {(gold)} gold coins.

+ [Buy a sword for 5 gold. ] {-5 gold}
  You purchase a fine blade.
>

You now have {(gold)} gold coins.
```

The `! gold = 10` at the start declares a variable. The `{-5 gold}` subtracts 5
from gold when that option is chosen.


## Changing Variables

Here are the ways to modify variables:

```
{+gold}       # Add 1 to gold
{+5 gold}     # Add 5 to gold
{-gold}       # Subtract 1 from gold
{-5 gold}     # Subtract 5 from gold
{=10 gold}    # Set gold to exactly 10
```


## Conditional Options

Make options appear only when conditions are met. Put conditions in braces
before the option text:

```
! gold = 5

+ {gold >= 10} [Buy the expensive hat. ] {-10 gold}
  You look fabulous!
+ {gold >= 3} [Buy a simple cap. ] {-3 gold}
  It keeps the sun off.
+ [Just browse. ]
  You window shop.
>
```

With 5 gold, you'll see the cap and browsing options, but not the expensive
hat.


## Conditions with Consequences

Some operators both check conditions AND have effects when chosen:

```
+ {-arrow} [Shoot an arrow. ]
  # Only shows if you have an arrow, and uses one arrow when chosen.

+ {!doorOpen} [Open the door. ]
  # Only shows if door is closed (0), sets it to 1 when chosen.

+ {?doorOpen} [Close the door. ]
  # Only shows if door is open (1), sets it to 0 when chosen.
```

This is the key to inventory systems and state management!


## A Complete Example: The Locked Door

Let's put it together:

```
@room

You are in a small room.
{(hasKey)? You have a key in your pocket. |}
{(doorOpen)? The door to the north stands open.
| The door to the north is closed{(doorLocked)? and locked|}.}

+ {doorOpen} [Go through the door. ] ->outside
+ {not doorOpen} {not doorLocked} {!doorOpen} [Open the door. ]
+ {doorOpen} {?doorOpen} [Close the door. ]
+ {not doorOpen} {doorLocked} {hasKey} {?doorLocked} [Unlock the door. ]
+ {not doorOpen} {not doorLocked} {!doorLocked} [Lock the door. ]
+ {not hasKey} [Search the room. ]
  You find a key under the rug!
  {=1 hasKey}
>

->room

@outside

Sunlight warms your face. You made it!
```

Try it out! You'll need to find the key, unlock the door, open it, and then
walk through.


## Questions and Answers

Kni has a special notation for showing different text in the menu versus the
narrative. The text in `[...]` is the question; text after is the answer:

```
+ [Open the door. ] You swing the heavy door open.
```

The menu shows "Open the door." but after choosing, the narrative reads "You
swing the heavy door open."

For second-person stories, use nested brackets:

```
+ [You o[O]pen the door. ]
```

The menu shows "Open the door." and the narrative shows "You open the door."
The capital letter in brackets marks where the question text begins.


## Multiple Paths Example

Here's a story with real consequences:

```
! gold = 3

You meet a merchant on the road.

+ {-2 gold} [Pay the toll. ]
  The merchant nods and lets you pass.
  ->castle
+ [Refuse to pay. ]
  The merchant scowls but steps aside.
  {=1 angeredMerchant}
  ->castle
+ [Turn back. ] ->village
>

@castle

You arrive at the castle gates.
{(angeredMerchant)?
  The merchant's friends block your way. "Pay up or leave!"
  + {-3 gold} [Pay the guards. ]
    They reluctantly let you enter.
  + [Leave in disgrace. ] <-
  >
|}

Welcome to the castle!

@village

You return to the village, your journey incomplete.
```


## Random Events

Add unpredictability with `{~option1|option2}`:

```
You roll the dice.
{~You rolled high! Victory is yours!
|You rolled low. Better luck next time.
|A perfect roll! Legendary!}
```

One of the three outcomes is chosen at random.


## Sequences

Show different text each time with `{first|second|third}`:

```
@fountain

You visit the fountain.
{You toss a coin and make a wish.|
The fountain sparkles in the sunlight.|
The familiar sound of water soothes you.|}

+ [Return to the square. ] ->square
>
```

The first visit shows the wish, second shows sparkles, third shows the
soothing water, and after that, nothing extra appears (the final empty
alternative).


## Loops

Use `@...` for a simple loop:

```
@...

+ [Keep going. ]
  You press onward.
+ [Rest. ]
  You catch your breath.
+ [Give up. ] <-
>
```

The `@...` label automatically loops back after each choice.


## Procedures

Create reusable narrative with procedures:

```
- @inventory()
  You are carrying
  {(gold)|nothing|{(gold)} gold{(arrows)| and {(arrows)} arrows|}}.

You enter the shop.
->inventory()

+ [Buy arrows. ] {-gold} {+3 arrows}
+ [Leave. ] <-
>

After shopping:
->inventory()
```

Procedures with `()` can be called and return to where they were called from.


## Text Formatting

A few helpful tricks:

```
Line one. /
Line two.              # / creates a line break

Paragraph one. //
Paragraph two.         # // creates a paragraph break

{"Hello,"} she said.   # Curly quotes
It was an en--dash.    # En-dash: –
And an em---dash.      # Em-dash: —
```


## Your Turn

You now know enough to write interactive stories with:

- Multiple locations connected by labels
- Choices that appear based on conditions
- Inventory and state tracking
- Consequences that follow the reader
- Reusable procedures

Start simple. Write a story with three rooms. Add a locked door. Give the
player an item to find. Watch how the pieces connect.

For the complete reference, see [MANUAL.md](MANUAL.md).

You are knight who writes Kni!

