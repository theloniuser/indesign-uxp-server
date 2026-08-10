/**
 * Master spread management handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse } from '../utils/stringUtils.js';
import { colorResolverSnippet } from '../utils/colorUtils.js';
import { mmToPt, withPointsUnitsSnippet } from '../utils/geometryUtils.js';

export class MasterSpreadHandlers {
    /**
     * Create a master spread
     */
    static async createMasterSpread(args) {
        const { name, namePrefix, baseName, showMasterItems = true } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const masterSpread = doc.masterSpreads.add();
            masterSpread.showMasterItems = ${showMasterItems};
            if (${JSON.stringify(name)} !== undefined) masterSpread.baseName = ${JSON.stringify(name)};
            if (${JSON.stringify(namePrefix)} !== undefined) masterSpread.namePrefix = ${JSON.stringify(namePrefix)};
            if (${JSON.stringify(baseName)} !== undefined) masterSpread.baseName = ${JSON.stringify(baseName)};
            return {
                success: true,
                name: masterSpread.name,
                namePrefix: masterSpread.namePrefix,
                baseName: masterSpread.baseName,
                id: masterSpread.id
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Master Spread")
            : formatErrorResponse(result?.error || 'Failed to create master spread', "Create Master Spread");
    }

    /**
     * List all master spreads
     */
    static async listMasterSpreads(args) {
        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const spreads = [];
            for (let i = 0; i < doc.masterSpreads.length; i++) {
                const ms = doc.masterSpreads.item(i);
                spreads.push({
                    index: i,
                    name: ms.name,
                    namePrefix: ms.namePrefix,
                    baseName: ms.baseName,
                    showMasterItems: ms.showMasterItems,
                    pages: ms.pages.length,
                    id: ms.id
                });
            }
            return { success: true, masterSpreads: spreads, count: spreads.length };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "List Master Spreads")
            : formatErrorResponse(result?.error || 'Failed to list master spreads', "List Master Spreads");
    }

    /**
     * Delete a master spread
     */
    static async deleteMasterSpread(args) {
        const { masterIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${masterIndex} >= doc.masterSpreads.length) return { success: false, error: 'Master spread index out of range' };
            const masterSpread = doc.masterSpreads.item(${masterIndex});
            const name = masterSpread.name;
            masterSpread.remove();
            return { success: true, deletedName: name };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Delete Master Spread")
            : formatErrorResponse(result?.error || 'Failed to delete master spread', "Delete Master Spread");
    }

    /**
     * Duplicate a master spread
     */
    static async duplicateMasterSpread(args) {
        const { masterIndex, position = 'AT_END', referenceMaster } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${masterIndex} >= doc.masterSpreads.length) return { success: false, error: 'Master spread index out of range' };
            const { LocationOptions } = require('indesign');
            const masterSpread = doc.masterSpreads.item(${masterIndex});
            let newMasterSpread;
            const pos = ${JSON.stringify(position)};
            if (pos === 'AT_END') {
                newMasterSpread = masterSpread.duplicate(LocationOptions.atEnd);
            } else if (pos === 'AT_BEGINNING') {
                newMasterSpread = masterSpread.duplicate(LocationOptions.atBeginning);
            } else if (pos === 'BEFORE' && ${referenceMaster} !== undefined) {
                newMasterSpread = masterSpread.duplicate(LocationOptions.before, doc.masterSpreads.item(${referenceMaster}));
            } else if (pos === 'AFTER' && ${referenceMaster} !== undefined) {
                newMasterSpread = masterSpread.duplicate(LocationOptions.after, doc.masterSpreads.item(${referenceMaster}));
            } else {
                newMasterSpread = masterSpread.duplicate(LocationOptions.atEnd);
            }
            return {
                success: true,
                name: newMasterSpread.name,
                namePrefix: newMasterSpread.namePrefix,
                baseName: newMasterSpread.baseName,
                id: newMasterSpread.id
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Duplicate Master Spread")
            : formatErrorResponse(result?.error || 'Failed to duplicate master spread', "Duplicate Master Spread");
    }

    /**
     * Apply a master spread to pages
     */
    static async applyMasterSpread(args) {
        const { masterName, pageRange } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const masterSpread = doc.masterSpreads.itemByName(${JSON.stringify(masterName)});
            if (!masterSpread.isValid) return { success: false, error: 'Master spread not found: ' + ${JSON.stringify(masterName)} };
            const pages = doc.pages;
            const pageRange = ${JSON.stringify(pageRange)};
            let appliedCount = 0;
            if (pageRange === 'all') {
                for (let i = 0; i < pages.length; i++) {
                    pages.item(i).appliedMaster = masterSpread;
                    appliedCount++;
                }
            } else if (pageRange.indexOf('-') !== -1) {
                const range = pageRange.split('-');
                const start = parseInt(range[0]) - 1;
                const end = parseInt(range[1]) - 1;
                for (let i = start; i <= end && i < pages.length; i++) {
                    pages.item(i).appliedMaster = masterSpread;
                    appliedCount++;
                }
            } else {
                const pageIndex = parseInt(pageRange) - 1;
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    pages.item(pageIndex).appliedMaster = masterSpread;
                    appliedCount++;
                }
            }
            return { success: true, masterName: masterSpread.name, appliedCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Apply Master Spread")
            : formatErrorResponse(result?.error || 'Failed to apply master spread', "Apply Master Spread");
    }

    /**
     * Create a text frame on a master spread
     */
    static async createMasterTextFrame(args) {
        const {
            masterName,
            content,
            x,
            y,
            width,
            height,
            fontSize = 12,
            fontFamily = "Arial",
            fontStyle = "Normal",
            alignment = "LEFT_ALIGN"
        } = args;

        const alignmentMap = {
            LEFT_ALIGN: 'leftAlign',
            CENTER_ALIGN: 'centerAlign',
            RIGHT_ALIGN: 'rightAlign',
            FULLY_JUSTIFIED: 'fullyJustified'
        };
        const uxpAlignment = alignmentMap[alignment] || 'leftAlign';
        const _xPt = mmToPt(x);
        const _yPt = mmToPt(y);
        const _x2Pt = mmToPt(x + width);
        const _y2Pt = mmToPt(y + height);

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const masterSpread = doc.masterSpreads.itemByName(${JSON.stringify(masterName)});
            if (!masterSpread.isValid) return { success: false, error: 'Master spread not found: ' + ${JSON.stringify(masterName)} };
            const { Justification } = require('indesign');
            const page = masterSpread.pages.item(0);
            const textFrame = page.textFrames.add();
            ${withPointsUnitsSnippet(`textFrame.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];`)}
            textFrame.contents = ${JSON.stringify(content)};
            textFrame.texts.item(0).pointSize = ${fontSize};
            try { textFrame.texts.item(0).appliedFont = app.fonts.itemByName(${JSON.stringify(fontFamily)}); } catch(e) {}
            textFrame.texts.item(0).fontStyle = ${JSON.stringify(fontStyle)};
            textFrame.texts.item(0).justification = Justification.${uxpAlignment};
            return {
                success: true,
                id: textFrame.id,
                geometricBounds: textFrame.geometricBounds
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Master Text Frame")
            : formatErrorResponse(result?.error || 'Failed to create master text frame', "Create Master Text Frame");
    }

    /**
     * Create a rectangle on a master spread
     */
    static async createMasterRectangle(args) {
        const {
            masterName,
            x,
            y,
            width,
            height,
            fillColor = "[None]",
            strokeColor = "[Black]",
            strokeWeight = 1
        } = args;

        const _xPt = mmToPt(x);
        const _yPt = mmToPt(y);
        const _x2Pt = mmToPt(x + width);
        const _y2Pt = mmToPt(y + height);

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const masterSpread = doc.masterSpreads.itemByName(${JSON.stringify(masterName)});
            if (!masterSpread.isValid) return { success: false, error: 'Master spread not found: ' + ${JSON.stringify(masterName)} };
            const page = masterSpread.pages.item(0);
            const rectangle = page.rectangles.add();
            ${withPointsUnitsSnippet(`rectangle.geometricBounds = [${_yPt}, ${_xPt}, ${_y2Pt}, ${_x2Pt}];`)}
            ${colorResolverSnippet('_fillColor', fillColor)}
            if (_fillColor) rectangle.fillColor = _fillColor;
            ${colorResolverSnippet('_strokeColor', strokeColor)}
            if (_strokeColor) rectangle.strokeColor = _strokeColor;
            rectangle.strokeWeight = ${strokeWeight};
            return {
                success: true,
                id: rectangle.id,
                geometricBounds: rectangle.geometricBounds
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Master Rectangle")
            : formatErrorResponse(result?.error || 'Failed to create master rectangle', "Create Master Rectangle");
    }

    /**
     * Create guides on a master spread
     */
    static async createMasterGuides(args) {
        const {
            masterName,
            numberOfRows = 0,
            numberOfColumns = 0,
            rowGutter,
            columnGutter,
            guideColor = '[0, 0, 255]',
            fitMargins = false,
            removeExisting = false
        } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            const masterSpread = doc.masterSpreads.itemByName(${JSON.stringify(masterName)});
            if (!masterSpread.isValid) return { success: false, error: 'Master spread not found: ' + ${JSON.stringify(masterName)} };
            masterSpread.createGuides(${numberOfRows}, ${numberOfColumns}, ${JSON.stringify(rowGutter || '')}, ${JSON.stringify(columnGutter || '')}, ${guideColor}, ${fitMargins}, ${removeExisting});
            return { success: true, masterName: masterSpread.name, rows: ${numberOfRows}, columns: ${numberOfColumns} };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Master Guides")
            : formatErrorResponse(result?.error || 'Failed to create master guides', "Create Master Guides");
    }

    /**
     * Get master spread information
     */
    static async getMasterSpreadInfo(args) {
        const { masterIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${masterIndex} >= doc.masterSpreads.length) return { success: false, error: 'Master spread index out of range' };
            const ms = doc.masterSpreads.item(${masterIndex});
            return {
                success: true,
                name: ms.name,
                namePrefix: ms.namePrefix,
                baseName: ms.baseName,
                showMasterItems: ms.showMasterItems,
                index: ${masterIndex},
                id: ms.id,
                counts: {
                    pages: ms.pages.length,
                    textFrames: ms.textFrames.length,
                    rectangles: ms.rectangles.length,
                    ovals: ms.ovals.length,
                    polygons: ms.polygons.length,
                    groups: ms.groups.length,
                    guides: ms.guides.length,
                    allPageItems: ms.allPageItems.length
                }
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Master Spread Info")
            : formatErrorResponse(result?.error || 'Failed to get master spread info', "Get Master Spread Info");
    }
}
