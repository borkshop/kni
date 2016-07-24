You stand at the base of a tree.

+ [You climb up[Climb] the trunk. ] ->notch(0)
+ [You w[W]alk away from the tree. ] <-
>
->start

- @notch(side)
  - {?not side} You rest in a fork in the trunk of the tree.
  - {?side} You rest in a notch in the tree, leaning {$side||northward|southward}.

  + [You c[C]limb north. ] ->notch(1)
  + [You c[C]limb south. ] ->notch(2)
  + [You c[C]limb down. ] <-
  >
  ->notch
