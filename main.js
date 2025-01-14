/* This code duplicates the normal Wick cursor. */
const newCursor = new Wick.Tools.Cursor();
newCursor.project = project;
newCursor.name = 'newcursor';
project._tools.newcursor = newCursor;

/* Copied from Wick Editor */
newCursor.onMouseDrag = function (e) {
  if (!e.modifiers) e.modifiers = {};

  this.__isDragging = true;

  if (this.hitResult.item && this.hitResult.item.data.isSelectionBoxGUI) {
    // Update selection drag
    if (!this._widget.currentTransformation) {
      this._widget.startTransformation(this.hitResult.item);
    }
    this._widget.updateTransformationMod(this.hitResult.item, e);
  } else if (this.selectionBox.active) {
    // Selection box is being used, update it with a new point
    this.selectionBox.drag(e.point);
  } else if (this.hitResult.item && this.hitResult.type === 'fill') {
    // We're dragging the selection itself, so move the whole item.
    if (!this._widget.currentTransformation) {
      this._widget.startTransformation(this.hitResult.item);
    }
    this._widget.updateTransformationMod(this.hitResult.item, e);
  } else {
    this.__isDragging = false;
  }
}

newCursor.onMouseUp = function (e) {
  if (!e.modifiers) e.modifiers = {};

  if (this.selectionBox.active) {
    // Finish selection box and select objects touching box (or inside box, if alt is held)
    this.selectionBox.mode = e.modifiers.alt ? 'contains' : 'intersects';
    this.selectionBox.end(e.point);

    if (!e.modifiers.shift) {
      this._selection.clear();
    }

    let selectables = this.selectionBox.items.filter(item => {
      return item.data.wickUUID;
    })

    this._selectItems(selectables);

    // Only modify the canvas if you actually selected something.
    if (this.selectionBox.items.length > 0) {
      this.fireEvent({
        eventName: 'canvasModified',
        actionName: 'cursorSelectMultiple'
      });
    }

  } else if (this._selection.numObjects > 0) {
    if (this.__isDragging) {
      this.__isDragging = false;
      this.project.tryToAutoCreateTween();
      this._widget.finishTransformationMod();
      this.fireEvent({
        eventName: 'canvasModified',
        actionName: 'cursorDrag'
      });
    }
  }
}

paper.SelectionWidget.prototype.updateTransformationMod = paper.SelectionWidget.prototype.updateTransformation;
paper.SelectionWidget.prototype.finishTransformationMod = paper.SelectionWidget.prototype.finishTransformation;

/* Set up + activate newCursor */
project._view._setupTools();
project._activeTool = newCursor;
newCursor.activate();
