" Vim syntax file
" Language: Kni
" Maintainer: Kris Kowal <kris@cixar.com> https://github.com/kriskowal/kni

syn match kniComment / #.*/
syn match kniComment2 /^#.*/
syn match kniTodo /\v(TODO|FIXME|XXX)/ containedin=kniComment,kniComment2
syn match kniSymbol /[{}\[\]|/\\]/
syn match kniBullet /^\s*[!\-\+\*]\s/
syn match kniPrompt /^\s*>/
syn match kniJump /\->\s*[a-zA-Z\.][a-zA-Z0-9\.]*/
syn match kniReturn /<\-/
syn match kniLabel /@[a-zA-Z\.][a-zA-Z0-9\.]*/
syn match kniExpression /[()]/

hi def link kniComment Comment
hi def link kniComment2 Comment
hi def link kniSymbol Type
hi def link kniBullet Type
hi def link kniPrompt Type
hi def link kniJump Statement
hi def link kniReturn Statement
hi def link kniLabel Statement
hi def link kniExpression Statement
hi def link kniTodo Todo
