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
      
      if (this.currentTransformation === 'rotate') {
        this.mod.action = 'rotate';
        this.mod.rotateDelta = 0;
        this.mod.initialAngle = this.mod.initialPoint.subtract(this.pivot).angle;
        this.mod.initialBoxRotation = this.boxRotation ?? 0;
      }
      else if (item.data.handleEdge.includes('Center')) {
        this.mod.action = 'move-edge';
        this.mod.scalePivot = this.pivot;
        this.mod.scaleFactor = new paper.Point(1,1);
        this.mod.shearOffset = new paper.Point(0,0);
      }
      else {
        this.mod.action = 'move-corner';
        this.mod.scalePivot = this.pivot;
      }

      this.mod.modifiers = {
        shift: e.modifiers.shift,
        alt: e.modifiers.alt
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

      this._ghost.scale(this.mod.onePoint.divide(this._ghost.data.scale), this.mod.scalePivot);
      
      if (e.modifiers.alt) {
        this.mod.scalePivot = this.pivot;
      }
      else {
        let bounds = this._ghost.bounds;
        switch (item.data.handleEdge) {
          case 'topRight':
            this.mod.scalePivot = bounds.bottomLeft;
            break;
          case 'topLeft':
            this.mod.scalePivot = bounds.bottomRight;
            break;
          case 'bottomRight':
            this.mod.scalePivot = bounds.topLeft;
            break;
          case 'bottomLeft':
            this.mod.scalePivot = bounds.topRight;
            break;
        }
      }
      
      var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.scalePivot);
      var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.scalePivot);
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

      this._ghost.scale(this._ghost.data.scale, this.mod.scalePivot);
      this._ghost.rotate(this.boxRotation, this.pivot);
    }
    else {
      this._ghost.rotate(-this.boxRotation, this.pivot);

      this._ghost.scale(this.mod.onePoint.divide(this.mod.scaleFactor), this.mod.scalePivot).shear(this.mod.shearOffset.multiply(-1), this.mod.scalePivot);
      
      if (e.modifiers.alt) {
        this.mod.scalePivot = this.pivot;
      }
      else {
        let bounds = this._ghost.bounds;
        switch (item.data.handleEdge) {
          case 'topCenter':
          case 'leftCenter':
            this.mod.scalePivot = bounds.bottomRight;
            break;
          case 'bottomCenter':
          case 'rightCenter':
            this.mod.scalePivot = bounds.topLeft;
            break;
        }
      }

      var currentPointRelative = e.point.rotate(-this.boxRotation, this.pivot).subtract(this.mod.scalePivot);
      var initialPointRelative = this.mod.initialPoint.rotate(-this.boxRotation, this.pivot).subtract(this.mod.scalePivot);
      if (e.modifiers.command) {
        var shearOffset = currentPointRelative.subtract(initialPointRelative).divide(this._ghost.bounds.height, this._ghost.bounds.width);
        if (item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'bottomCenter') {
          shearOffset.y = 0;
        }
        else {
          shearOffset.x = 0;
        }
        if (item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'leftCenter') {
          shearOffset = shearOffset.multiply(-1);
        };
        this.mod.shearOffset = shearOffset;
      }
      else {
        var scaleFactor = currentPointRelative.divide(initialPointRelative);
        if (item.data.handleEdge === 'topCenter' || item.data.handleEdge === 'bottomCenter') {
          scaleFactor.x = 1;
        }
        else {
          scaleFactor.y = 1;
        }
        this.mod.scaleFactor = scaleFactor;
      }

      this._ghost.scale(this.mod.scaleFactor, this.mod.scalePivot).shear(this.mod.shearOffset, this.mod.scalePivot);
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
      this.scaleSelectionMod(this._ghost.data.scale, this.mod.scalePivot);
    }
    else {
      this.scaleShearSelectionMod(this.mod.scaleFactor, this.mod.shearOffset, this.mod.scalePivot);
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
paper.SelectionWidget.prototype.scaleShearSelectionMod = function (scale, shear, pivot) {
  this._itemsInSelection.forEach(item => {
    item.rotate(-this.boxRotation, this.pivot);
    item.scale(scale, pivot).shear(shear, pivot);
    item.rotate(this.boxRotation, this.pivot);
  });
  
  var newPivot = this.pivot.subtract(pivot).transform(new paper.Matrix(scale.x, shear.y, shear.x, scale.y, 0, 0)).add(pivot);
  this.pivot = newPivot.rotate(this.boxRotation, this.pivot);
}
