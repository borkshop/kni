"This example generates a field of values around the origin of a two-dimensional
plane, illustrating how Inkblot can assign a consistent hash to every
coordinate in that plane without symmetry about any axis.  This random variable
is useful for procedurally generated places, people, and things. //

Most of this example involves iterating over the (x, y) coordinate plane about
the origin. The "#" block maps the given expression to consistent hash.
The inner "#" is a binary operator that produces a Hilbert curve, ensuring
that the consistent hash provides no symmetric axes, producing a sequence of
values that wends around itself in the plane. //

{=10 s}
{=0 y}
- @outer
  {=0 x}
  - @inner
    {#(x-s/2)#(y-s/2)
    |A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z} -
  {+x} {<=s x|->inner} /
{+y} {<=s y|->outer}
