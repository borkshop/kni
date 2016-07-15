{=3cat}
{=2rat}
{=1bat}

@loop

There are {, and |
- {>0 rat} rats{,}
- {>0 cat} cats{,}
- {>0 bat} bats{,}
}. //

{-rat}
{-cat}
{-bat}

{?(rat>0) or (cat>0) or (bat>0)|->loop}
