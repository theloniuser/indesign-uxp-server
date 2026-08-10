/**
 * Graphics management handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse, escapeJsxString } from '../utils/stringUtils.js';
import { sessionManager } from '../core/sessionManager.js';
import { colorResolverSnippet } from '../utils/colorUtils.js';
import { mmToPt, withPointsUnitsSnippet } from '../utils/geometryUtils.js';

export class GraphicsHandlers {
    /**
     * Create a rectangle on the active page
     */
    static async createRectangle(args) {
        const {
            x,
            y,
            width,
            height,
            pageIndex = null,
            fillColor,
            strokeColor,
            strokeWidth = 1,
            cornerRadius = 0
        } = args;

        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : (() => {
                const pos = sessionManager.getCalculatedPositioning({ x, y, width, height });
                const validation = sessionManager.validatePositioning(pos.x, pos.y, pos.width, pos.height);
                if (!validation.valid) {
                    if (validation.suggested) Object.assign(pos, validation.suggested);
                    else Object.assign(pos, sessionManager.getCalculatedPositioning({}));
                }
                return pos;
            })();

        const _xPt = mmToPt(positioning.x);
        const _yPt = mmToPt(positioning.y);
        const _x2Pt = mmToPt(positioning.x + positioning.width);
        const _y2Pt = mmToPt(positioning.y + positioning.height);
        const _cornerRadiusPt = mmToPt(Number(cornerRadius) || 0);

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }

            try {
                const rect = page.rectangles.add();
                ${withPointsUnitsSnippet(`
                rect.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];
                if (${_cornerRadiusPt} > 0) {
                    const { CornerOptions } = require('indesign');
                    rect.topLeftCornerOption = CornerOptions.roundedCorner;
                    rect.topRightCornerOption = CornerOptions.roundedCorner;
                    rect.bottomLeftCornerOption = CornerOptions.roundedCorner;
                    rect.bottomRightCornerOption = CornerOptions.roundedCorner;
                    rect.cornerRadius = ${_cornerRadiusPt};
                }
                `)}

                ${colorResolverSnippet('_fillColor', fillColor)}
                if (_fillColor) rect.fillColor = _fillColor;
                ${colorResolverSnippet('_strokeColor', strokeColor)}
                if (_strokeColor) {
                    rect.strokeColor = _strokeColor;
                    rect.strokeWeight = ${strokeWidth};
                }

                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error creating rectangle: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            // Store the created item info in session
            sessionManager.setLastCreatedItem({
                type: 'rectangle',
                position: positioning,
                fillColor: fillColor,
                strokeColor: strokeColor,
                strokeWidth: strokeWidth,
                cornerRadius: cornerRadius
            });
        }

        return result?.success ?
            formatResponse('Rectangle created successfully', "Create Rectangle") :
            formatErrorResponse(result?.error || 'Failed to create rectangle', "Create Rectangle");
    }

    /**
     * Create an ellipse on the active page
     */
    static async createEllipse(args) {
        const {
            x,
            y,
            width,
            height,
            pageIndex = null,
            fillColor,
            strokeColor,
            strokeWidth = 1
        } = args;

        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : (() => {
                const pos = sessionManager.getCalculatedPositioning({ x, y, width, height });
                const validation = sessionManager.validatePositioning(pos.x, pos.y, pos.width, pos.height);
                if (!validation.valid) {
                    if (validation.suggested) Object.assign(pos, validation.suggested);
                    else Object.assign(pos, sessionManager.getCalculatedPositioning({}));
                }
                return pos;
            })();

        const _xPt = mmToPt(positioning.x);
        const _yPt = mmToPt(positioning.y);
        const _x2Pt = mmToPt(positioning.x + positioning.width);
        const _y2Pt = mmToPt(positioning.y + positioning.height);

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }

            try {
                const ellipse = page.ovals.add();
                ${withPointsUnitsSnippet(`ellipse.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];`)}

                ${colorResolverSnippet('_fillColor', fillColor)}
                if (_fillColor) ellipse.fillColor = _fillColor;
                ${colorResolverSnippet('_strokeColor', strokeColor)}
                if (_strokeColor) {
                    ellipse.strokeColor = _strokeColor;
                    ellipse.strokeWeight = ${strokeWidth};
                }

                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error creating ellipse: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            // Store the created item info in session
            sessionManager.setLastCreatedItem({
                type: 'ellipse',
                position: positioning,
                fillColor: fillColor,
                strokeColor: strokeColor,
                strokeWidth: strokeWidth
            });
        }

        return result?.success ?
            formatResponse('Ellipse created successfully', "Create Ellipse") :
            formatErrorResponse(result?.error || 'Failed to create ellipse', "Create Ellipse");
    }

    /**
     * Create a polygon on the active page
     */
    static async createPolygon(args) {
        const {
            x,
            y,
            width,
            height,
            pageIndex = null,
            sides = 6,
            fillColor,
            strokeColor,
            strokeWidth = 1
        } = args;

        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : sessionManager.getCalculatedPositioning({ x, y, width, height });

        const _xPt = mmToPt(positioning.x);
        const _yPt = mmToPt(positioning.y);
        const _x2Pt = mmToPt(positioning.x + positioning.width);
        const _y2Pt = mmToPt(positioning.y + positioning.height);

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }

            try {
                const polygon = page.polygons.add();
                ${withPointsUnitsSnippet(`polygon.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];`)}
                polygon.numberOfSides = ${sides};

                ${colorResolverSnippet('_fillColor', fillColor)}
                if (_fillColor) polygon.fillColor = _fillColor;
                ${colorResolverSnippet('_strokeColor', strokeColor)}
                if (_strokeColor) {
                    polygon.strokeColor = _strokeColor;
                    polygon.strokeWeight = ${strokeWidth};
                }

                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error creating polygon: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            // Store the created item info in session
            sessionManager.setLastCreatedItem({
                type: 'polygon',
                sides: sides,
                position: positioning,
                fillColor: fillColor,
                strokeColor: strokeColor,
                strokeWidth: strokeWidth
            });
        }

        return result?.success ?
            formatResponse('Polygon created successfully', "Create Polygon") :
            formatErrorResponse(result?.error || 'Failed to create polygon', "Create Polygon");
    }

    /**
     * Place an image on the active page with enhanced options
     */
    static async placeImage(args) {
        const {
            filePath,
            x,
            y,
            width,
            height,
            pageIndex = null,
            applyObjectStyle = ''
        } = args;

        const hasAllCoords = x !== undefined && y !== undefined && width !== undefined && height !== undefined;
        const positioning = hasAllCoords
            ? { x, y, width, height }
            : sessionManager.getCalculatedPositioning({ x, y, width, height });

        const _xPt = mmToPt(positioning.x);
        const _yPt = mmToPt(positioning.y);
        const _x2Pt = mmToPt(positioning.x + positioning.width);
        const _y2Pt = mmToPt(positioning.y + positioning.height);

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const _pi = ${JSON.stringify(pageIndex)};
            let page;
            if (_pi !== null) {
                if (_pi < 0 || _pi >= doc.pages.length) return { success: false, error: 'Page index out of range' };
                page = doc.pages.item(_pi);
            } else {
                try { page = doc.activePage; if (!page || !page.isValid) page = doc.pages.item(0); }
                catch(e) { page = doc.pages.item(0); }
            }
            const rect = page.rectangles.add();
            ${withPointsUnitsSnippet(`rect.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];`)}

            try {
                rect.place(${JSON.stringify(filePath)});

                const objectStyleName = ${JSON.stringify(applyObjectStyle)};
                if (objectStyleName) {
                    try {
                        const oStyle = doc.objectStyles.itemByName(objectStyleName);
                        if (oStyle.isValid) rect.appliedObjectStyle = oStyle;
                    } catch(e) {}
                }

                return { success: true, message: 'Image placed at ' + ${JSON.stringify(filePath)} };
            } catch(e) {
                rect.remove();
                return { success: false, error: 'Failed to place image: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);

        if (result?.success) {
            sessionManager.setLastCreatedItem({
                type: 'image',
                filePath: filePath,
                position: positioning,
                objectStyle: applyObjectStyle
            });
        }

        return result?.success ?
            formatResponse(result.message, "Place Image") :
            formatErrorResponse(result?.error || 'Failed to place image', "Place Image");
    }

    /**
     * Create an object style
     */
    static async createObjectStyle(args) {
        const {
            name,
            fillColor,
            strokeColor,
            strokeWeight = 1,
            cornerRadius = 0,
            transparency = 100
        } = args;

        const _cornerRadiusPt = mmToPt(Number(cornerRadius) || 0);

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;

            try {
                const objectStyle = doc.objectStyles.add({ name: ${JSON.stringify(name)} });

                ${colorResolverSnippet('_fillColor', fillColor)}
                if (_fillColor) objectStyle.fillColor = _fillColor;
                ${colorResolverSnippet('_strokeColor', strokeColor)}
                if (_strokeColor) {
                    objectStyle.strokeColor = _strokeColor;
                    objectStyle.strokeWeight = ${strokeWeight};
                }
                if (${_cornerRadiusPt} > 0) {
                    ${withPointsUnitsSnippet(`
                    const { CornerOptions } = require('indesign');
                    objectStyle.topLeftCornerOption = CornerOptions.roundedCorner;
                    objectStyle.topRightCornerOption = CornerOptions.roundedCorner;
                    objectStyle.bottomLeftCornerOption = CornerOptions.roundedCorner;
                    objectStyle.bottomRightCornerOption = CornerOptions.roundedCorner;
                    objectStyle.cornerRadius = ${_cornerRadiusPt};
                    `)}
                }
                if (${transparency} < 100) {
                    try { objectStyle.transparencySettings.blendingSettings.opacity = ${transparency}; } catch(e) {}
                }

                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error creating object style: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`Object style '${name}' created successfully`, "Create Object Style") :
            formatErrorResponse(result?.error || 'Failed to create object style', "Create Object Style");
    }

    /**
     * List all object styles
     */
    static async listObjectStyles() {
        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;

            const styles = [];
            for (let i = 0; i < doc.objectStyles.length; i++) {
                const style = doc.objectStyles.item(i);
                if (style.isValid) {
                    styles.push({
                        name: style.name,
                        fillColor: style.fillColor ? style.fillColor.name : 'None',
                        strokeColor: style.strokeColor ? style.strokeColor.name : 'None',
                        strokeWeight: style.strokeWeight,
                        cornerRadius: style.cornerRadius
                    });
                }
            }

            return { success: true, styles: styles };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        if (result?.success) {
            const lines = ['=== OBJECT STYLES ==='];
            for (const s of (result.styles || [])) {
                lines.push(`Name: ${s.name}`);
                lines.push(`  Fill Color: ${s.fillColor}`);
                lines.push(`  Stroke Color: ${s.strokeColor}`);
                lines.push(`  Stroke Weight: ${s.strokeWeight}`);
                lines.push(`  Corner Radius: ${s.cornerRadius}`);
                lines.push('');
            }
            return formatResponse(lines.join('\n'), "List Object Styles");
        }
        return formatErrorResponse(result?.error || 'Failed to list object styles', "List Object Styles");
    }

    /**
     * Apply object style to a page item
     */
    static async applyObjectStyle(args) {
        const {
            styleName,
            itemType = 'rectangle',
            itemIndex = 0
        } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);

            try {
                const objectStyle = doc.objectStyles.itemByName(${JSON.stringify(styleName)});
                if (!objectStyle.isValid) {
                    return { success: false, error: "Object style '${styleName}' not found" };
                }

                let item;
                const type = ${JSON.stringify(itemType)};
                const idx = ${itemIndex};

                if (type === 'rectangle') {
                    if (idx >= page.rectangles.length) return { success: false, error: 'Rectangle index out of range' };
                    item = page.rectangles.item(idx);
                } else if (type === 'ellipse') {
                    if (idx >= page.ovals.length) return { success: false, error: 'Ellipse index out of range' };
                    item = page.ovals.item(idx);
                } else if (type === 'polygon') {
                    if (idx >= page.polygons.length) return { success: false, error: 'Polygon index out of range' };
                    item = page.polygons.item(idx);
                } else {
                    return { success: false, error: 'Invalid item type. Use: rectangle, ellipse, or polygon' };
                }

                item.appliedObjectStyle = objectStyle;
                return { success: true };
            } catch(e) {
                return { success: false, error: 'Error applying object style: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success ?
            formatResponse(`Object style '${styleName}' applied successfully`, "Apply Object Style") :
            formatErrorResponse(result?.error || 'Failed to apply object style', "Apply Object Style");
    }

    /**
     * Get image information
     */
    static async getImageInfo(args) {
        const { itemIndex = 0 } = args;

        const code = `
            if (app.documents.length === 0) {
                return { success: false, error: 'No document open' };
            }
            const doc = app.activeDocument;
            const page = doc.pages.item(0);

            try {
                const allGraphics = page.allGraphics;
                if (!allGraphics || allGraphics.length === 0) {
                    return { success: false, error: 'No images found on page' };
                }

                const idx = ${itemIndex};
                if (idx >= allGraphics.length) {
                    return { success: false, error: 'Image index ' + idx + ' not found. Total images: ' + allGraphics.length };
                }

                const graphic = allGraphics[idx];
                let filePath = '';
                let fileName = '';
                let linkStatus = '';
                try {
                    filePath = graphic.itemLink ? graphic.itemLink.filePath : '';
                    fileName = graphic.itemLink ? graphic.itemLink.name : '';
                    linkStatus = graphic.itemLink ? String(graphic.itemLink.status) : '';
                } catch(e) {}

                return {
                    success: true,
                    index: idx,
                    filePath: filePath,
                    fileName: fileName,
                    linkStatus: linkStatus,
                    imageTypeName: graphic.imageTypeName || '',
                    actualPpi: graphic.actualPpi || [],
                    effectivePpi: graphic.effectivePpi || [],
                    geometricBounds: graphic.geometricBounds || [],
                    visibleBounds: graphic.visibleBounds || []
                };
            } catch(e) {
                return { success: false, error: 'Error getting image information: ' + e.message };
            }
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        if (result?.success) {
            const lines = [
                '=== IMAGE INFORMATION ===',
                `Image ${result.index}:`,
                `  File Path: ${result.filePath}`,
                `  File Name: ${result.fileName}`,
                `  Link Status: ${result.linkStatus}`,
                `  Image Type: ${result.imageTypeName}`,
                `  Actual PPI: ${Array.isArray(result.actualPpi) ? result.actualPpi.join(', ') : result.actualPpi}`,
                `  Effective PPI: ${Array.isArray(result.effectivePpi) ? result.effectivePpi.join(', ') : result.effectivePpi}`,
                `  Geometric Bounds: ${Array.isArray(result.geometricBounds) ? result.geometricBounds.join(', ') : result.geometricBounds}`,
                `  Visible Bounds: ${Array.isArray(result.visibleBounds) ? result.visibleBounds.join(', ') : result.visibleBounds}`
            ];
            return formatResponse(lines.join('\n'), "Get Image Info");
        }
        return formatErrorResponse(result?.error || 'Failed to get image info', "Get Image Info");
    }
} 