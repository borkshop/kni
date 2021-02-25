# v3.0.2

- Backport of v4.0.3 package-lock regeneration to eliminate unpm references

# v3.0.1

- Fix missing index.js file

# v3.0.0

This version allows options to be declared in subroutines.

This major version breaks compatibility with previous JSON state machines.
The new state machine has reserved "RET" and "ESC" labels, instead of
using null to mean "return". The "escape" label is new, and causes a
function to return through a call "branch" when it returns, instead of
following to the "next" of the call site.

This major version also breaks compatibility with previous JSON interactive
story state objects.  These have a new format that is almost fully
desymbolicated, which makes them more brittle to story changes but makes the
URL anchor for HTML stories more compact.

The command line mode now supports "back" and diagnostic commands "capture" and
"replay".

# v2.2.2

- Fix command line usage by upgrading the command line argument parser, SHON.

# v2.2.1

- Fix missing file in package.json

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
