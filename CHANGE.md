
# v2.2.0

- Adds HTML command line flags for color, background color, and title for
  single interactive HTML page generation.

# v2.1.0

- Adds a `--html` flag that writes the script as a single interactive page.

# v2.0.0

- This version changes the behavior of keyword options so that the first option
  to introduce a keyword has precedence over all subsequent options.
- The engine now emits a `choice` event to handlers, so the handler can observe
  which choice was made and particularly what its keywords are.

# v1.1.0

This version adds support for option keywords.

```kni
+ <apple> [You chose[Choose] apple. ]
+ <orange> <lemon> [You chose[Choose] orange or lemon. ]
+ <grape> [] You chose a grape, which wasn'}t even on the menu.
>
```

# v1.0.0
