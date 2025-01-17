/* Create + inject modified transform functions */
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
      this.mod.needsInitiate = false;

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

      var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
      var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.truePivot);
      
      if (!e.modifiers.command || (e.modifiers.command && e.modifiers.shift)) {
        var scaleFactor = currentPointRelative.divide(initialPointRelative);
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
        var shearOffset = currentPointRelative.subtract(initialPointRelative).divide(this._ghost.bounds.height, this._ghost.bounds.width);
        if (this.mod.vertical) {
          shearOffset.y = 0;
        }
        else {
          shearOffset.x = 0;
        }
        if (e.modifiers.alt) {
          shearOffset = shearOffset.multiply(2);
        }
        if (this.mod.topLeft) {
          shearOffset = shearOffset.multiply(-1);
        };

        this.mod.transformMatrix.shear(shearOffset.transform(this.mod.transformMatrix.inverted()));
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
}

paper.SelectionWidget.prototype.startTransformationMod = start;
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
    
    var offset = pivot;
    item.translate(offset.multiply(-1)).transform(matrix).translate(offset);
    
    item.rotate(this.boxRotation, this.pivot);
  });

  // Note that the GUI won't show this pivot as the center because it doesn't account for skew.
  // The pivot point after the skew will look a bit off.
  var newPivot = pivot.add(this.pivot.subtract(pivot).transform(matrix));
  this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}
