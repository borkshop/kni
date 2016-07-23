! a = 2
  b = 3
{((a * b) % 5)||1} /
{(a<=2)|2 } /
{(b<=2)|3 } /
{(b>=3)|4 } /
{(a==2)|5 } /
{(b==3)|6 } /
{(b!=3)|7 } /
{(b>=3)|8 } /
{(a<2)|9 } /
{(a<b)|10 } /
{(b>3)|11 } /
{(a<2)|12 } /
{(b>3)|13 } /
{(3<=2)||14 } /
{(3<2)|15 } /
{(1<2)||16 } /
{(0 or 0)|17 } /
{(0 and 0)|18 } /
{(0 and 1)|19 } /
{(1 and 1)||20 } /
{(0 or 1)||21 } /
{(not 1)|22} == 22 /
{(1 and 1)} should be 1 /
{(1 and 1)|0|1} should be 1 /
{(1 and 1)|0|1|2} should be 1 /
{(0 or 1)} should be 1 /
{(0 or 1 and 0)} should be 0 /
{(not (0 or 1 and 0))} should be 1 /
{(not not(0 or not 0 and 0))} should be 0 /
{(not(1 == 1))|0|1} should be 0 /
{(~6)} in 0-5 /
{(#0)} is hash of 0 and should not be 0 /
{(0#0)} is hilbert of (0, 0), midway through i32 domain /
{(-32768#-32768)} is hilbert of (-half i16, -half i16), and should be zero /
