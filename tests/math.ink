{=2 a} {=3 b} /
{?(a * b) % 5|1 } /
{<=2a|2 } /
{<=2b||3 } /
{>=3b|4 } /
{==2a|5 } /
{==3b|6 } /
{!=3b||7 } /
{>=3b|8 } /
{<2a||9 } /
{<b a|10 } /
{>3b||11 } /
{<2a||12 } /
{>3b||13 } /
{?3<=2|14 } /
{?3<2||15 } /
{?1<2|16 } /
{?0 or 0||17 } /
{?0 and 0||18 } /
{?0 and 1||19 } /
{?1 and 1|20 } /
{?0 or 1|21 } /
{$!1|22} == 22 /
{$1 and 1} should be 1 /
{?1 and 1|1|0} should be 1 /
{$1 and 1|0|1|2} should be 1 /
{$0 or 1} should be 1 /
{$0 or 1 and 0} should be 0 /
{$!(0 or 1 and 0)} should be 1 /
{$!!(0 or !0 and 0)} should be 0 /
{?!(1 == 1)|1|0} should be 0 /
{$~6} in 0-5 /
{$#0} is hash of 0 and should not be 0 /
{$0#0} is hilbert of (0, 0), midway through i32 domain /
{$-32768#-32768} is hilbert of (-half i16, -half i16), and should be zero /
