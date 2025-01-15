function startTransformation(item) {
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
function updateTransformation(item, e) {
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
      else if (item.data.handleEdge.contains('Center')) {
        this.mod.action = 'resize-edge';
      }
      else {
        this.mod.action = 'resize-corner';
      }
    }
    console.log('hi');
  }
}
function finishTransformation(item) {
  if(!this._currentTransformation) return;

  this._ghost.remove();

  if(this.currentTransformation === 'translate') {
    var d = this._ghost.position.subtract(this._ghost.data.initialPosition);
    this.translateSelection(d);
  }

  this._currentTransformation = null;
}
