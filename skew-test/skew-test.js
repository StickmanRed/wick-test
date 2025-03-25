/* Modifying Wick.Transformation */
Wick.Transformation = class {
    constructor (args) {
        if(!args) args = {};

        this.x = args.x === undefined ? 0 : args.x;
        this.y = args.y === undefined ? 0 : args.y;
        this.scaleX = args.scaleX === undefined ? 1 : args.scaleX;
        this.scaleY = args.scaleY === undefined ? 1 : args.scaleY;
        this.skewX = args.skewX === undefined ? 0 : args.skewX;
        this.skewY = args.skewY === undefined ? 0 : args.skewY;
        this.rotation = args.rotation === undefined ? 0 : args.rotation;
        this.opacity = args.opacity === undefined ? 1 : args.opacity;
    }

    get values () {
        return {
            x: this.x,
            y: this.y,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            skewX: this.skewX,
            skewY: this.skewY,
            rotation: this.rotation,
            opacity: this.opacity,
        }
    }

    copy () { return new Wick.Transformation(this.values); }
}

/* Modifying View.Clip.render */
Wick.View.Clip.prototype.render = function render () {
    // Prevent an unselectable object from being rendered
    // due to a clip having no content on the first frame.
    this.model.ensureActiveFrameIsContentful();

    // Render timeline view
    this.model.timeline.view.render();

    // Add some debug info to the paper group
    this.group.data.wickType = 'clip';
    this.group.data.wickUUID = this.model.uuid;

    // Add frame views from timeline
    this.group.removeChildren();
    this.group.addChildren(this.model.timeline.view.frameLayers);

    // Update transformations
    this.group.matrix.set(new paper.Matrix());
    this._bounds = this.group.bounds.clone();

    //this._radius = null;

    this.group.pivot = new this.paper.Point(0,0);
    this.group.translate(this.model.transformation.x, this.model.transformation.y);
    this.group.scale(this.model.transformation.scaleX, this.model.transformation.scaleY);
    this.group.rotate(this.model.transformation.rotation);
    this.group.opacity = this.model.transformation.opacity;

    // Update all the transformation data
    this.group.data.modTransformData = {
        x: this.model.transformation.x,
        y: this.model.transformation.y,
        scaleX: this.model.transformation.scaleX,
        scaleY: this.model.transformation.scaleY,
        skewX: 0,
        skewY: 0,
        rotation: this.model.transformation.rotation
    };;
    
}

/* Modifying the View.Frame functions */
Wick.View.Frame.prototype._applyDrawableChanges = function () {
    this.model.drawable.filter(path=>{return path instanceof Wick.Path&&path.isDynamicText}).forEach(path=>{path.view.item.bringToFront()});var drawables=this.model.drawable.concat([]);drawables.forEach(drawable=>{this.model.removeClip(drawable)});this.objectsLayer.children.filter(child=>{return child.data.wickType!=='gui'}).forEach(child=>{if(child instanceof paper.Group||child instanceof Wick.Clip){this.model.addClip(drawables.find(g=>{return g.uuid===child.data.wickUUID}))}else{var originalWickPath=child.data.wickUUID?Wick.ObjectCache.getObjectByUUID(child.data.wickUUID):null;var pathJSON=Wick.View.Path.exportJSON(child);var wickPath=new Wick.Path({project:this.model.project,json:pathJSON});this.model.addPath(wickPath);wickPath.fontWeight=originalWickPath?originalWickPath.fontWeight:400;wickPath.fontStyle=originalWickPath?originalWickPath.fontStyle:'normal';wickPath.identifier=originalWickPath?originalWickPath.identifier:null;child.name=wickPath.uuid}});
    
    this.objectsLayer.children.filter(child => {
        return child.data.wickType !== 'gui';
    }).forEach(child => {
        if (child instanceof paper.Group || child instanceof Wick.Clip) {
            var wickClip = Wick.ObjectCache.getObjectByUUID(child.data.wickUUID);
            if (child.data.modTransformData) {
                wickClip.transformation = new Wick.Transformation({
                    x: child.data.modTransformData.x,
                    y: child.data.modTransformData.y,
                    scaleX: child.data.modTransformData.scaleX,
                    scaleY: child.data.modTransformData.scaleY,
                    rotation: child.data.modTransformData.rotation,
                    opacity: child.opacity
                });
            }
            else {
                wickClip.transformation.opacity = child.opacity;
            }
        }
    });
}

/* Modifying the selection functions */
paper.SelectionWidget.prototype.translateSelection = function (delta) {
    this._itemsInSelection.forEach(item => {
        item.position = item.position.add(delta);

        if (item instanceof paper.Group) {
            item.data.modTransformData.x += delta.x;
            item.data.modTransformData.y += delta.y;
        }
    });
    this.pivot = this.pivot.add(delta);
}

/**
 *
 */
paper.SelectionWidget.prototype.scaleSelection = function (scale) {
    this._itemsInSelection.forEach(item => {
        item.rotate(-this.boxRotation, this.pivot);
        item.scale(scale, this.pivot);
        item.rotate(this.boxRotation, this.pivot);

        if (item instanceof paper.Group) {
            item.data.modTransformData.scaleX *= scale.x;
            item.data.modTransformData.scaleY *= scale.y;
        }
    });
}

/**
 *
 */
paper.SelectionWidget.prototype.rotateSelection = function (angle) {
    this._itemsInSelection.forEach(item => {
        item.rotate(angle, this.pivot);
        
        if (item instanceof paper.Group) {
            item.data.modTransformData.rotation += angle;
        }
    });
}
