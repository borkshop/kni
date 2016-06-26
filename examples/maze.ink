You are {$x} west and {$y} north.

{=(x#y) here}
{=((x+1)#y) west}
{=((x-1)#y) east}
{=(x#(y+1)) north}
{=(x#(y-1)) south}
{=((west==here+1)v(west==here-1)) west.open}
{=((south==here+1)v(south==here-1)) south.open}
{=((north==here+1)v(north==here-1)) north.open}
{=((east==here+1)v(east==here-1)) east.open}

- {?west.open}
  + You g[G]o west. {+x}
- {?east.open}
  + You g[G]o east. {-x}
- {?north.open}
  + You g[G]o north. {+y}
- {?south.open}
  + You g[G]o south. {-y}
+ Escape <-
>

-> start
