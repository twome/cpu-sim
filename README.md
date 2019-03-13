# von Neumann CPU simulator

This is a quick model of a specific illustrative computer architecture described in "Computer Science: an overview" by J. Glenn Brookshear. I made this to better understand all the core concepts using the language most familiar to me (Javascript), and particularly to make it easier to truly understand machine language. The code isn't efficient, nor particularly readable (particularly the browser rendering code).

## Structure notes

`/peers` are deps I've written that aren't published online anywhere, so they're just included in the repo.

## Running

Just serve the root directory with a static server, such as [live-server](https://github.com/tapio/live-server) or with `python -m SimpleHTTPServer 8000`.
Hit 'boot' to start.

## Licence

MIT