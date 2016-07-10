@blue

You are in a blue room.
There is a door.

@blue2

- {?door} The door is open.
  + You w[W]alk through the open door. -> red
  + You c[C]lose the door.
    - {=0 door} -> blue2
- {!door} The door is closed.
  + You o[O]pen the door. 
    - {=1 door} -> blue2
+ Where am I again? -> blue
>

@red

You are in a red room.
There is a door and a bell.

@red2

- {?door} The door is open.
  + You w[W]alk through the open door. -> blue
  + You c[C]lose the door.
    - {=0 door} -> red2
- {!door} The door is closed.
  + You o[O]pen the door.
    - {=1 door} -> red2
+ You r[R]ing the bell.
+ Where am I again? -> red
>

A dark portal opens and swallows you whole.
You lose consciousness.
When you come to, you see…
