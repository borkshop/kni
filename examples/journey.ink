{=0 hour} {=0 x} # the time and place
{=0 hunger} {=0 thirst} # how many meals and bottles of water are needed
{=0 fish} {=0 deer} # how many meals worth of food
{=0 water} {=2 empty} # how many bottles of water, how many empty
{=0 river} # whether there is water in the vicinity
{=0 game} # whether there is game in the vicinity

You begin your journey at {->time}.
-> journey

= journey
  - {>=7 thirst} However, you succumb to your thirst. -> death
  - {>=7 hunger} However, You succumb to your hunger. -> death

  {->setting}
  ---
  {->status}
  {->inventory}
  + You v[V]enture east. {+1x} {->tick} {->now} {->travel} ->journey
  - {>0x}
    + You r[R]eturn west. {-1x} {->tick} {->now} ->journey
  - {!river} {?thirst} {?water}
    + You d[D]rink from your stored water.
      {-1 thirst} {-1 water} {+1 empty} ->journey
  - {?river}
    + You rest here[Rest here, drink your fill, and refill your bottles.]
      {$empty|| filling your bottles of water{->fill}{$thirst|| and |}}
      {$thirst|| drinking your fill from the stream{=0 thirst}}. ->journey
    + Try fishing. {->fishing} ->journey
  - {?hunger} {?fish}
    + You e[E]at one of your fish. /
      {-1 fish} {-1 hunger} ->journey
  - {?hunger} {?deer}
    + You e[E]at a meal of smoked venison. /
      {-1 deer} {-1 hunger} ->journey
  ->journey

= travel()
  You have {~come |traveled |journeyed |ventured } {$x} league{$x|s||s}.

= fishing()
  You spread out your hooks and line and settle in for a bit of fishing.

  - {?thirst} {=0 thirst} While your line bobs, you take a spare moment to
    quench your thirst from the running water.

  = fish.again
  {->reset.fish.chances}

  = fish.loop
    {?fish.chances}
    {-1 fish.chances}
    {~||->done.fishing}
    -> fish.loop
  = done.fishing

  - {?fish.chances}
    {~A fish wanders by and tentatively nibbles your line. |
    You feel a nibble on your line. |
    Out of the blue, you feel a tug and your rod dips toward the water. }
    {~You have {~him|her} on line and drag the fish {~in|to shore}! |
    The fish drags your line and you pull {~him|her} to the shore! }
    {+1fish}
    You now have {$fish} fish.
  - {!fish.chances}
    {~Time passes but no fish have bitten. |
    You may have felt a nibble, but the time is lost. |
    The fish seem shy this hour. |
    After a while, a fish wallows by your hook but pays it no heed. }

  ---

  {->tick} {->now}
  {->status}
  {->inventory}

  + Try again.
  + Perhaps another time. / You pack up and return to the trail. <-

  {~You bait your hook with a worm and toss it out again. |
  You try a fresh worm you find in the loam. |
  You cast your line off once {~again|more}. |
  You cast off once {~again|more}. }

  -> fish.again

= reset.fish.chances()
  {=1 fish.chances} # default
  {$hour|
  {=6 fish.chances} | # high don, the hour of the rowan|
  {=3 fish.chances} | # elm hour, the hour after high don|
  | # fir hour, the hour before high non|
  | # high non, with the sun overhead|
  | # cedar hour, the hour after high non|
  {=3 fish.chances} | # holly hour, the hour before high dusk|
  {=6 fish.chances} | # high dusk, the hour of the hawthorne|
  {=6 fish.chances} | # low dusk, the hour of the alder|
  {=3 fish.chances} | # ash hour, the hour after low dusk|
  | # oak hour, the hour before low non|
  | # low non, the hour of the elder|
  | # birch hour, the hour after low non|
  {=3 fish.chances} | # yew hour, the hour before low don|
  {=6 fish.chances} } # low don, the hour of the willow

= tick()
  {+1 hour}
  {$hour|
  | # high don, the hour of the rowan|
  {+1 thirst} | # elm hour, the hour after high don|
  {+1 hunger} | # fir hour, the hour before high non|
  {+1 thirst} | # high non, with the sun overhead|
  | # cedar hour, the hour after high non|
  {+1 thirst} | # holly hour, the hour before high dusk|
  | # high dusk, the hour of the hawthorne|
  | # low dusk, the hour of the alder|
  {+1 hunger} | # ash hour, the hour after low dusk|
  | # oak hour, the hour before low non|
  {+1 thirst} | # low non, the hour of the elder|
  | # birch hour, the hour after low non|
  {+1 thirst} | # yew hour, the hour before low don|
  {+1 hunger} } # low don, the hour of the willow
  - {>=14 hour} {=0 hour}

= now()
  The hour rolls on, now {->time}.

= setting()
  {#x|->forest|->clearing|->river}

= forest()
  {=0 river}
  {~You find yourself in a copse of {->tree} trees. |
  You find yourself among the trunks of {->tree} trees. |
  The trunks of {->tree} surround you. }

= tree()
  {#x|rowan|elm|fir|cedar|holly|hawthorne|alder|ash|oak|elder|birch|yew|willow}

= clearing()
  {=0 river}
  {~You find yourself in a clearing. |
  The forest opens to clearing. |
  The trees clear around you, revealing the sky above. }
  - {>7hour} {~Stars twinkle overhead. |
    The night sky is breathtaking. |
    The constellations of the galaxy {~mill|wheel} about the sky. |||}

= river()
  {=1 river}
  {~A river with fresh water flows through here. |
  A wide stream flows across the way. |
  Waters flow down from the hills to the north, over the trail here. }

= fill()
  - {?empty} {+1water} {-1empty} -> fill

= inventory()
  - {!hunger} {!thirst} <-
  You have
  {$water|{$deer|{$fish|no food nor water to spare. <-|}|}|}
  {$water|no water {$deer|{$fish| and | but }| but }|}
  {$water||{$water} bottle{$water|s||s} of water
  {$deer|{$fish| and naught to eat. <-| and }| and }}
  {$deer||smoked venision for {$deer} meal{$deer|s||s}}
  {$fish|. <-|{$deer|| and }}
  {$fish||fish for {$fish} meal{$fish|s||s}}
  in reserve.

= time()
  {$hour|
  high don, the hour of the rowan|
  elm hour, the hour after high don|
  fir hour, the hour before high non|
  high non, with the sun directly overhead|
  cedar hour, the hour after high non|
  holly hour, the hour before high dusk|
  high dusk, the hour of the hawthorne|
  low dusk, the hour of the alder|
  ash hour, the hour after low dusk|
  oak hour, the hour before low non|
  low non, the hour of the elder and the middle of the night|
  birch hour, the hour after low non|
  yew hour, the hour before low don|
  low don, the hour of the willow}

= status()
  {$thirst|{$hunger||You {->hunger}. }|
  {$hunger|You are thirsty. |You {->hunger} and have some thirst. }|
  You are quite thirsty{$hunger|| and {->hunger}}. |
  You are parched. |
  Your thirst consumes you. }
  - {>=5 thirst} -> dying
  - {>=5 hunger} =dying You are at death’s door.

= hunger()
  {$hunger||
  could eat|
  have an appetite|
  are hungry|
  need food badly|
  are starving|
  have missed more meals than you care to remember|
  are emaciated and wasting away|
  are likely to die of your hunger soon}

= death
  The {$x} league marker serves as your grave stone.
