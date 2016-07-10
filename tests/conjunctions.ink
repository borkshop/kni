{=3cat}
{=2rat}
{=1bat}

@loop

There are {, and |
- {>0 rat} rats{,}
- {>0 cat} cats{,}
- {>0 bat} bats{,}
}. ---

{-rat}
{-cat}
{-bat}

{?(rat>0) v (cat>0) v (bat>0)|->loop}
