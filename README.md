# `debug` [![Build Status](https://travis-ci.org/atom-community/debug.svg?branch=master)](https://travis-ci.org/atom-community/debug) [![Build status](https://ci.appveyor.com/api/projects/status/rwt6dhb945stnk48/branch/master?svg=true)](https://ci.appveyor.com/project/joefitzgerald/debug/branch/master)

`debug` allows you to debug your code using debug providers.

## How to add a new debugger

[API.md](API.md)

## Key bindings

* `f5` runs the current package (`dlv debug`)
* `ctrl-f5` runs the current package tests (`dlv test`)
* `shift-f5` restarts the current delve session (`r / restart`)
* `f6` stops delve (`exit / quit / q`)
* `f8` continue the execution (`c / continue`)
* `f9` toggle breakpoint
* `f10` step over to next source line (`n / next`)
* `f11` step into functions (`s / step`)
* `cmd-k cmd-g` (mac) / `ctrl-k ctrl-g` (others) toggles the main panel
