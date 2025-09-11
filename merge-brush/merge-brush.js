// Just a test for merging brush strokes of the same color.

project.tools.brush._applyBrushMode = function (mode, path, layer) {
    if(!mode) {
        console.warn('_applyBrushMode: Invalid brush mode: ' + mode);
        console.warn('Valid brush modes are "inside" and "outside".')
        return;
    }

    if(mode === 'none') {
        return path;
    }

    var merged = path.clone({insert:false});
    // Should iterate backwards through layer.children, where the last element is the front
    layer.children.findLast(otherPath => {
        if (((otherPath.className !== "Path") &&
            (otherPath.className !== "CompoundPath")) ||
            (!otherPath.fillColor.equals(path.fillColor))) {
            // Found object that can't be merged. Stop searching
            console.log('ok it stopped');
            console.log(otherPath.className === "Path", !otherPath.fillColor.equals(path.fillColor))
            return true;
        }
        merged = merged.unite(otherPath);
        merged.remove();
        
        // Since we're merging the two paths, remove otherPath
        if (otherPath.data.wickUUID) {
            var otherWickPath = this.project.getObjectByUUID(otherPath.data.wickUUID);
            otherWickPath.remove();
        }
        otherPath.remove();
    });
    return merged;
}
