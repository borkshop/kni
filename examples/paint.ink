! red = 0
  green = 1
  blue = 2

This room is {({x}.{y})|red|green|blue}.

@decide
+ [You p[P]aint this room red. ] {=red {x}.{y}} ->decide
+ [You p[P]aint this room green. ] {=green {x}.{y}} ->decide
+ [You p[P]aint this room blue. ] {=blue {x}.{y}} ->decide
+ [You w[W]alk west. ] {-x}
+ [You w[W]alk east. ] {+x}
+ [You w[W]alk north. ] {-y}
+ [You w[W]alk south. ] {+y}
>
->start
