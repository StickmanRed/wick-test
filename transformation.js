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
      else if (item.data.handleEdge.includes('Center')) { this.mod.action = 'move-edge'; }
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
    
    if (this.mod.action === 'move-corner') {
      // if (!mod.modifiers.shift && !mod.modifiers.alt)
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
