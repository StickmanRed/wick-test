/* This code duplicates the normal Wick cursor. */
const newCursor = new Wick.Tools.Cursor();
newCursor.project = project;
newCursor.paperTool = project._tools.cursor.paperTool;
newCursor.name = 'newcursor'
project._tools.newcursor = newCursor;

project._view._setupTools()
project._activeTool = newCursor;
newCursor.activate();
