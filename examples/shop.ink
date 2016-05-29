
{=2 gold}
{=0 arrow}

=shop

You have {$arrow|no arrows|an arrow|{$arrow} arrows} and
{$gold|no gold|a gold piece|{$gold} gold}.

- {!gold} {!arrow} You depart the store through the back door. -> end

- {?gold}
  + You b[B]uy 3 arrows for a gold piece. /
    {-1 gold} {+3 arrow} -> shop
- {>=4 arrow}
  + You s[S]ell 4 arrows for a gold piece. /
    {+1 gold} {-4 arrow} -> shop
+ You walk through the door to [Visit] the archery range. -> range
+ You depart from the store through the back door[Leave the store]. -> end

=range

You have {$arrow|no arrows|an arrow|{$arrow} arrows}.

- {?arrow}
  + You s[S]hoot an arrow {-1 arrow}
    {~and hit the target and win 1 gold! {+1 gold} -> range||}
    and miss. -> range
+ You r[R]eturn to the archery shop. -> shop

= end
