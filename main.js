/* This code duplicates the normal Wick cursor. */
const newCursor = new Wick.Tools.Cursor();
newCursor.project = project;
newCursor.name = 'newcursor'
project._tools.newcursor = newCursor;

project._view._setupTools()
project._activeTool = newCursor;
newCursor.activate();
