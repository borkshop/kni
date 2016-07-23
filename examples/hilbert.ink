This example generates a field of values, every one adjacent to a neighboring
letter of the alphabet. The example employs a Hilbert curve to fill a
multi-dimensional space with a continuous, undulating line. Hilbert curves
ensure that every point is traversable from another and that ranges of a
Hilbert curve close over a contiguous region. //

Most of this example involves iterating over the (x, y) coordinate plane about
the origin. The Hilbert curve is produced by the "#" operator. //

{=10 s} # size: height and width
{=0 y}
- @outer
  {=0 x}
  - @inner
    {@(x-s/2)#(y-s/2)
    |A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z} -
  {+x} {(x <= s)||->inner} /
{+y} {(y <= s)||->outer}
