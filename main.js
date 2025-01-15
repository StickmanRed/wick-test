function start(item) {
  this._ghost = this._buildGhost();
  this._layer.addChild(this._ghost);

  if(item.data.handleType === 'rotation') {
    this.currentTransformation = 'rotate';
  } else if (item.data.handleType === 'scale') {
    this.currentTransformation = 'scale';
  } else {
    this.currentTransformation = 'translate';
  }
  
  this._ghost.data.initialPosition = this._ghost.position;
  this._ghost.data.scale = new paper.Point(1,1);

  this.mod = {
    needsInitiate: true
  };
}
function update(item, e) {
  if (this.currentTransformation === 'translate') {
    this._ghost.position = this._ghost.position.add(e.delta);
  }
  else {
    if (this.mod.needsInitiate) {
      var lastPoint = e.point.subtract(e.delta);
      this.mod.initialPoint = lastPoint;
      if (this.currentTransformation === 'rotate') {
        this.mod.action = 'rotate';
      }
      else if (item.data.handleEdge.includes('Center')) {
        this.mod.action = 'resize-edge';
      }
      else {
        this.mod.action = 'resize-corner';
      }
    }
    console.log('hi'); // Placeholder
  }
}
function finish(item) {
  if(!this._currentTransformation) return;

  this._ghost.remove();

  if(this.currentTransformation === 'translate') {
    var d = this._ghost.position.subtract(this._ghost.data.initialPosition);
    this.translateSelection(d);
  }

  this._currentTransformation = null;
}

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
      this._widget.startTransformationMod(this.hitResult.item);
    }
    this._widget.updateTransformationMod(this.hitResult.item, e);
  } else if (this.selectionBox.active) {
    // Selection box is being used, update it with a new point
    this.selectionBox.drag(e.point);
  } else if (this.hitResult.item && this.hitResult.type === 'fill') {
    // We're dragging the selection itself, so move the whole item.
    if (!this._widget.currentTransformation) {
      this._widget.startTransformationMod(this.hitResult.item);
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

paper.SelectionWidget.prototype.startTransformationMod = start;
paper.SelectionWidget.prototype.updateTransformationMod = update;
paper.SelectionWidget.prototype.finishTransformationMod = finish;

/* Set up + activate newCursor */
project._view._setupTools();
project._activeTool = newCursor;
newCursor.activate();
