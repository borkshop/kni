{~Choose|Pick} a number from 1 to 100.
---

{=1 lo}
{=100 hi}

= try

{=(hi+lo)/2 mid}
{? hi == lo | -> end}

Is the number less than {$mid}? {+q}
+ Yes /
  {=mid-1 hi}
+ No /
  {=mid lo}
>

{=(hi+lo)/2 mid}
{? hi == lo | -> end}

Is the number greater than {$mid}? {+q}
+ Yes /
  {=mid+1 lo}
+ No /
  {=mid hi}
>

-> try

= end

The number is {$hi}.
I guessed after asking {$q} question{$q|s||s}.
