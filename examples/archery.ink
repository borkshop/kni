{=2 gold}
{=0 arrow}
{=0 hit}

You enter the fletcher’s shop. The fletcher beckons, “There are arrows for sale
and a range out back to try your skill and fortune. For each score hit, you win
more gold!” //

-> shop

- @shop

  You have {$arrow|no arrows|an arrow|{$arrow} arrows}
  {$arrow|{$gold| and | but }| and } {-> gold}.

  - {!gold} {!arrow} -> exit

  - {?gold}
    + [You b[B]uy 3 arrows for a gold piece. ]
      {-gold} {+3 arrow} -> shop
  - {>=4 arrow}
    + [You s[S]ell 4 arrows for a gold piece. ]
      {+gold} {-4 arrow} -> shop
  + [You walk through the door to [Visit] the archery range. ] -> range
  + [Leave the store. ] -> exit
  >

- @range

  You have {$arrow|no arrows|an arrow|{$arrow} arrows}.

  - {?arrow}
    + [You s[S]hoot an arrow[.]] {-arrow}
      {~ and hit the target, winning 1 gold piece!
      {+gold} {+hit} -> range||}
      and miss. -> range
  + [You r[R]eturn to the archery shop. ] -> shop
  >

- @gold()
  {$gold|no gold|a gold piece|{$gold} gold}

- @exit
  You depart the store through the back door with {->gold}.
  {?hit} All told, you scored {$hit} hit{$hit|s||s}.
