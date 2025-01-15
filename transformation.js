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
      this.mod.initialPoint = e.point;
      
      if (this.currentTransformation === 'rotate') {
        this.mod.action = 'rotate';
        this.mod.rotateDelta = 0;
        this.mod.initialAngle = this.mod.initialPoint.subtract(this.pivot).angle;
        this.mod.initialBoxRotation = this.boxRotation ?? 0;
      }
      else if (item.data.handleEdge.includes('Center')) { this.mod.action = 'move-edge'; }
      else { this.mod.action = 'move-corner'; }

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
    
    /*if (this.mod.action === 'move-corner') {
      // if (!mod.modifiers.shift && !mod.modifiers.alt)
      
    }*/
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

  this._currentTransformation = null;
}
