{=0 red} {=1 green} {=2 blue}

This room is {$room.$x.$y|red|green|blue}.

=decide
+ You p[P]aint this room red. {=red room.$x.$y} ->decide
+ You p[P]aint this room green. {=green room.$x.$y} ->decide
+ You p[P]aint this room blue. {=blue room.$x.$y} ->decide
+ You w[W]alk west. {-x}
+ You w[W]alk east. {+x}
+ You w[W]alk north. {-y}
+ You w[W]alk south. {+y}
>
->start
