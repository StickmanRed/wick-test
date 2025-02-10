/* Create + inject modified transform functions */
function update(item, e) {
  if (this.currentTransformation === 'translate') {
    this._ghost.position = this._ghost.position.add(e.delta);
  }
  else {
    // Wick. What is wrong with you. It would be nice if I could place the initiation in this function. But why in the world do I get a
    // Uncaught TypeError: Cannot read properties of undefined (reading 'includes')
    if (!this.mod?.initiated) {
      this.mod = {
        initiated: true
      }

      this.mod.onePoint = new paper.Point(1,1);
      this.mod.initialPoint = e.point;
      
      this.mod.truePivot = this.pivot;
      
      if (this.currentTransformation === 'rotate') {
        this.mod.action = 'rotate';
        this.mod.rotateDelta = 0;
        this.mod.initialAngle = this.mod.initialPoint.subtract(this.pivot).angle;
        this.mod.initialBoxRotation = this.boxRotation ?? 0;
      }
      else if (item.data.handleEdge.includes('Center')) {
        this.mod.action = 'move-edge';
        this.mod.topLeft = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'leftCenter';
        this.mod.vertical = item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'bottomCenter';

        this.mod.transformMatrix = new paper.Matrix();
      }
      else {
        this.mod.action = 'move-corner';
      }
    }
    
    if (this.mod.action === 'rotate') {
      this._ghost.rotate(-this.mod.rotateDelta, this.pivot);
      this.mod.rotateDelta = e.point.subtract(this.pivot).angle - this.mod.initialAngle
      this._ghost.rotate(this.mod.rotateDelta, this.pivot);
      this.boxRotation = this.mod.initialBoxRotation + this.mod.rotateDelta;
    }
    else if (this.mod.action === 'move-corner') {
      this._ghost.rotate(-this.boxRotation, this.pivot);
      this._ghost.scale(this.mod.onePoint.divide(this._ghost.data.scale), this.mod.truePivot);
      
      if (e.modifiers.alt) {
        this.mod.truePivot = this.pivot;
      }
      else {
        let bounds = this._ghost.bounds;
        switch (item.data.handleEdge) {
          case 'topRight':
            this.mod.truePivot = bounds.bottomLeft;
            break;
          case 'topLeft':
            this.mod.truePivot = bounds.bottomRight;
            break;
          case 'bottomRight':
            this.mod.truePivot = bounds.topLeft;
            break;
          case 'bottomLeft':
            this.mod.truePivot = bounds.topRight;
            break;
        }
      }
      
      var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
      var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
      var scaleFactor = currentPointRelative.divide(initialPointRelative);
      if (!e.modifiers.shift) {
        if (Math.abs(scaleFactor.x) < Math.abs(scaleFactor.y)) {
          scaleFactor.x = Math.sign(scaleFactor.x) * Math.abs(scaleFactor.y);
        }
        else {
          scaleFactor.y = Math.sign(scaleFactor.y) * Math.abs(scaleFactor.x);
        }
      }
      this._ghost.data.scale = scaleFactor;

      this._ghost.scale(this._ghost.data.scale, this.mod.truePivot);
      this._ghost.rotate(this.boxRotation, this.pivot);
    }
    else {
      this._ghost.rotate(-this.boxRotation, this.pivot);
      this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix.inverted()).translate(this.mod.truePivot);
      
      if (e.modifiers.alt) {
        this.mod.truePivot = this.pivot;
      }
      else {
        if (this.mod.topLeft) {
            this.mod.truePivot = this._ghost.bounds.bottomRight;
        }
        else {
            this.mod.truePivot = this._ghost.bounds.topLeft;
        }
      }
      
      this.mod.transformMatrix.reset();

      var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot);
      var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot);
      
      if (!e.modifiers.command || (e.modifiers.command && e.modifiers.shift)) {
        var scaleFactor = currentPointRelative.subtract(this.mod.truePivot).divide(initialPointRelative.subtract(this.mod.truePivot));
        if (this.mod.vertical) {
          scaleFactor.x = 1;
        }
        else {
          scaleFactor.y = 1;
        }

        this.mod.transformMatrix.scale(scaleFactor)
      }
      if (e.modifiers.command) {
        // Shear is still a factor. Apply shear after scale to transform properly
        var shearFactor = currentPointRelative.subtract(initialPointRelative).divide(this._ghost.bounds.height, this._ghost.bounds.width);
        if (this.mod.vertical) { shearFactor.y = 0; } else { shearFactor.x = 0; }
        if (e.modifiers.alt) {
          shearFactor = shearFactor.multiply(2);
        }
        if (this.mod.topLeft) {
          shearFactor = shearFactor.multiply(-1);
        };

        this.mod.transformMatrix.shear(shearFactor.transform(this.mod.transformMatrix.inverted()));
      }

      this._ghost.translate(this.mod.truePivot.multiply(-1)).transform(this.mod.transformMatrix).translate(this.mod.truePivot);
      this._ghost.rotate(this.boxRotation, this.pivot);
    }
  }
}
function finish(item) {
  if (!this._currentTransformation) return;

  this._ghost.remove();

  if (this.currentTransformation === 'translate') {
    var d = this._ghost.position.subtract(this._ghost.data.initialPosition);
    this.translateSelection(d);
  }
  else if (this.currentTransformation === 'rotate') {
    this.rotateSelection(this._ghost.rotation);
  }
  else if (this.currentTransformation === 'scale') {
    if (this.mod.action === 'move-corner') {
      this.scaleSelectionMod(this._ghost.data.scale, this.mod.truePivot);
    }
    else {
      this.transformSelectionMod(this.mod.transformMatrix, this.mod.truePivot);
    }
  }

  this._currentTransformation = null;
  this.mod.initiated = false;
}

paper.SelectionWidget.prototype.updateTransformationMod = update;
paper.SelectionWidget.prototype.finishTransformationMod = finish;
paper.SelectionWidget.prototype.scaleSelectionMod = function (scale, pivot) {
  this._itemsInSelection.forEach(item => {
    item.rotate(-this.boxRotation, this.pivot);
    item.scale(scale, pivot);
    item.rotate(this.boxRotation, this.pivot);
  });
  
  var newPivot = pivot.add(this.pivot.subtract(pivot).multiply(scale));
  this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}
paper.SelectionWidget.prototype.transformSelectionMod = function (matrix, pivot) {
  this._itemsInSelection.forEach(item => {
    item.rotate(-this.boxRotation, this.pivot);
    item.translate(pivot.multiply(-1)).transform(matrix).translate(pivot);
    item.rotate(this.boxRotation, this.pivot);
  });

  // Note that the GUI won't show this pivot as the center because it doesn't account for skew.
  // The pivot point after the skew will look a bit off.
  var newPivot = pivot.add(this.pivot.subtract(pivot).transform(matrix));
  this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}

/* Duplicate the normal Wick Cursor */
const newCursor = new Wick.Tools.Cursor();
newCursor.project = project;
newCursor.name = 'newcursor';
project._tools.newcursor = newCursor;

/* Modify the Cursor logic
 * This code-paragraph was copied from Wick Editor. */
// https://github.com/Wicklets/wick-editor/blob/f34f0d9512d7165e74c1910ea1aba9173ab8dec2/engine/src/tools/Cursor.js#L133
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
// https://github.com/Wicklets/wick-editor/blob/f34f0d9512d7165e74c1910ea1aba9173ab8dec2/engine/src/base/Selection.js#L128
Wick.Selection.prototype.select = function (object) {

  // Activate the cursor tool when selection changes
  if (this._locationOf(object) === 'Canvas') {
    if (this.project.activeTool.name === 'newcursor') {
      this.project.activeTool = this.project.tools.newcursor;
    }
    else {
      this.project.activeTool = this.project.tools.cursor;
    }
    object.parentLayer && object.parentLayer.activate();
  }

  // Only allow selection of objects of in the same location
  if (this._locationOf(object) !== this.location) {
      this.clear();
  }

  // Add the object to the selection!
  this._selectedObjectsUUIDs.push(object.uuid);

  // Select in between frames (for shift+click selecting frames)
  if (object instanceof Wick.Frame) {
      this._selectInBetweenFrames(object);
  }

  this._resetPositioningValues();

  // Make sure the view gets updated the next time its needed...
  this.view.dirty = true;
}

/* Set up + activate newCursor */
// Look into https://github.com/Wicklets/wick-editor/blob/f34f0d9512d7165e74c1910ea1aba9173ab8dec2/src/Editor/EditorCore.jsx#L41
project._view._setupTools();
project._activeTool = newCursor;
newCursor.activate();
