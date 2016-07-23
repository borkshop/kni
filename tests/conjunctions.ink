! cat = 3
  rat = 2
  bat = 1

@loop

There are {, and |
{(rat > 0)|| rats{,}}
{(cat > 0)|| cats{,}}
{(bat > 0)|| bats{,}}
}. //

{-rat}
{-cat}
{-bat}

{(rat > 0 or cat > 0 or bat > 0)||->loop}
