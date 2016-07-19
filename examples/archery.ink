! gold = 2
  arrow = 0
  score = 0

You enter the fletcher'}s shop. The fletcher beckons, {"There are arrows for
sale and a range out back to try your skill and fortune. For each score hit,
you win more gold!"} //

- @shop

  You have {-> arrow}
  {(arrow)|{(gold)| and | but }| and }
  {-> gold}.

  {(!gold and !arrow)||->exit}

  + {-gold} {+3arrow}
    [You b[B]uy 3 arrows for a gold piece. ]
  + {+gold} {-4arrow}
    [You s[S]ell 4 arrows for a gold piece. ]
  + [You walk through the door to [Visit] the archery range. ]
    -> range
  + [Leave the store. ] -> exit
  >

  ->shop

- @range

  You have {(arrow)|no arrows|an arrow|{(arrow)} arrows}.

  + {-arrow}
    [You s[S]hoot an arrow[.]]
    {~ and hit the target, winning 1 gold piece!
    {+gold} {+score} ->range||}
    and miss.
  + [You r[R]eturn to the archery shop. ] -> shop
  >

  ->range

- @arrow()
  {(arrow)|no arrows|an arrow|{(arrow)} arrows}

- @gold()
  {(gold)|no gold|a gold piece|{(gold)} gold}

- @exit
  You depart the store through the back door with {->gold}.
  {(score)||All told, you scored {(score)} hit{(score)|s||s}.}
