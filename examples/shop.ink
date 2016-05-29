
{=2 gold}
{=0 arrow}

=shop

You have {#arrow|no arrows|an arrow|{$arrow} arrows} and
{#gold|no gold|a gold piece|{$gold} gold}.

- {?gold}
  + You b[B]uy a dozen arrows for a gold piece. /
    {-1 gold} {+12 arrow} -> shop
- {>=20 arrow}
  + You s[S]ell 20 arrows for a gold piece. /
    {+1 gold} {-20 arrow} -> shop
+ You walk through the door to [Visit] the archery range. -> range
+ You depart from the store through the back door[Leave the store]. -> end

=range

You have {#arrow|no arrows|an arrow|{$arrow} arrows}.

- {?arrow}
  + You s[S]hoot an arrow. {-1 arrow} -> range
+ You r[R]eturn to the archery shop. -> shop

= end
