# This example illustrates the use of dynamic variable names to emulate
# something akin to arrays using Inkblot’s single, global dictionary of
# variables. It also shows a hack for comma and conjunction delimited lists.
# The trick isn’t as pretty with the affordance for an Oxford comma.

@list
{=0 i}
@shapes
{>=shapes.length i|->options}
{$shapes.{i}||square|circle}{$shapes.length-i+1|| and |, }
{+i} ->shapes

@options
+ [Add a square. ]
  {=1 shapes.{shapes.length}} {+shapes.length}
+ [Add a circle. ]
  {=2 shapes.{shapes.length}} {+shapes.length}
- {?shapes.length}
  + [Pop a shape. ] {-shapes.length}
>

->list
