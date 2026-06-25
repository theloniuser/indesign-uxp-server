/**
 * Group management handlers
 */
import { ScriptExecutor } from '../core/scriptExecutor.js';
import { formatResponse, formatErrorResponse } from '../utils/stringUtils.js';

export class GroupHandlers {
    /**
     * Create a group from selected items
     */
    static async createGroup(args) {
        const { pageIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const selection = app.selection;
            if (!selection || selection.length < 2) return { success: false, error: 'Select at least 2 items to create a group' };
            let group;
            try {
                group = selection[0].group();
            } catch(e) {
                try {
                    group = doc.groups.add(selection);
                } catch(e2) {
                    return { success: false, error: 'Failed to create group: ' + e2.message };
                }
            }
            let itemCount = 0;
            try { itemCount = group.allPageItems.length; } catch(e) {}
            return { success: true, id: group.id, itemCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Group")
            : formatErrorResponse(result?.error || 'Failed to create group', "Create Group");
    }

    /**
     * Create a group from specific page items
     */
    static async createGroupFromItems(args) {
        const { pageIndex, itemIndices } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const { SelectionOptions } = require('indesign');
            const page = doc.pages.item(${pageIndex});
            const indices = ${JSON.stringify(itemIndices)};
            if (indices.length < 2) return { success: false, error: 'Need at least 2 items to create a group' };
            const items = [];
            for (let i = 0; i < indices.length; i++) {
                if (indices[i] < page.allPageItems.length) {
                    items.push(page.allPageItems[indices[i]]);
                }
            }
            if (items.length < 2) return { success: false, error: 'Not enough valid items to create a group' };
            for (let j = 0; j < items.length; j++) {
                if (j === 0) {
                    items[j].select(SelectionOptions.replaceWith);
                } else {
                    items[j].select(SelectionOptions.addTo);
                }
            }
            let group;
            try {
                group = items[0].group();
            } catch(e) {
                try {
                    group = doc.groups.add(items);
                } catch(e2) {
                    return { success: false, error: 'Failed to create group: ' + e2.message };
                }
            }
            let itemCount = 0;
            try { itemCount = group.allPageItems.length; } catch(e) {}
            return { success: true, id: group.id, itemCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Create Group From Items")
            : formatErrorResponse(result?.error || 'Failed to create group from items', "Create Group From Items");
    }

    /**
     * Ungroup a group
     */
    static async ungroup(args) {
        const { pageIndex, groupIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            if (${groupIndex} < 0 || ${groupIndex} >= page.allPageItems.length) return { success: false, error: 'Group index out of range' };
            const item = page.allPageItems[${groupIndex}];
            let isGroup = false;
            try {
                isGroup = typeof item.pageItems !== 'undefined' || item.constructor?.name === 'Group';
            } catch(e) {}
            if (!isGroup) return { success: false, error: 'Selected item is not a group' };
            let itemCount = 0;
            try { itemCount = item.allPageItems.length; } catch(e) {}
            try {
                item.ungroup();
            } catch(e) {
                return { success: false, error: 'Failed to ungroup: ' + e.message };
            }
            return { success: true, releasedItemCount: itemCount };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Ungroup")
            : formatErrorResponse(result?.error || 'Failed to ungroup', "Ungroup");
    }

    /**
     * Get group information
     */
    static async getGroupInfo(args) {
        const { pageIndex, groupIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            if (${groupIndex} < 0 || ${groupIndex} >= page.allPageItems.length) return { success: false, error: 'Group index out of range' };
            const item = page.allPageItems[${groupIndex}];
            let isGroup = false;
            try {
                isGroup = typeof item.pageItems !== 'undefined' || item.constructor?.name === 'Group';
            } catch(e) {}
            if (!isGroup) return { success: false, error: 'Selected item is not a group' };
            const contents = [];
            try {
                for (let i = 0; i < item.allPageItems.length; i++) {
                    const groupItem = item.allPageItems[i];
                    let type = 'Unknown';
                    try { type = groupItem.constructor?.name || 'Unknown'; } catch(e) {}
                    contents.push({ index: i, type, id: groupItem.id });
                }
            } catch(e) {}
            return {
                success: true,
                name: item.name || 'Unnamed',
                id: item.id,
                visible: item.visible,
                locked: item.locked,
                geometricBounds: item.geometricBounds,
                itemCount: contents.length,
                contents
            };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Get Group Info")
            : formatErrorResponse(result?.error || 'Failed to get group info', "Get Group Info");
    }

    /**
     * Add item to group
     */
    static async addItemToGroup(args) {
        const { pageIndex, groupIndex, itemIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            if (${groupIndex} < 0 || ${groupIndex} >= page.allPageItems.length) return { success: false, error: 'Group index out of range' };
            const group = page.allPageItems[${groupIndex}];
            let isGroup = false;
            try {
                isGroup = typeof group.pageItems !== 'undefined' || group.constructor?.name === 'Group';
            } catch(e) {}
            if (!isGroup) return { success: false, error: 'Selected item is not a group' };
            if (${itemIndex} < 0 || ${itemIndex} >= page.allPageItems.length) return { success: false, error: 'Item index out of range' };
            const item = page.allPageItems[${itemIndex}];
            try {
                group.add(item);
            } catch(e) {
                return { success: false, error: 'Failed to add item to group: ' + e.message };
            }
            return { success: true, groupId: group.id, itemId: item.id };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Add Item to Group")
            : formatErrorResponse(result?.error || 'Failed to add item to group', "Add Item to Group");
    }

    /**
     * Remove item from group
     */
    static async removeItemFromGroup(args) {
        const { pageIndex, groupIndex, itemIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            if (${groupIndex} < 0 || ${groupIndex} >= page.allPageItems.length) return { success: false, error: 'Group index out of range' };
            const group = page.allPageItems[${groupIndex}];
            let isGroup = false;
            try {
                isGroup = typeof group.pageItems !== 'undefined' || group.constructor?.name === 'Group';
            } catch(e) {}
            if (!isGroup) return { success: false, error: 'Selected item is not a group' };
            let groupItems;
            try { groupItems = group.allPageItems; } catch(e) { return { success: false, error: 'Cannot access group items' }; }
            if (${itemIndex} < 0 || ${itemIndex} >= groupItems.length) return { success: false, error: 'Item index out of range in group' };
            const item = groupItems[${itemIndex}];
            const itemId = item.id;
            try {
                group.remove(item);
            } catch(e) {
                return { success: false, error: 'Failed to remove item from group: ' + e.message };
            }
            return { success: true, groupId: group.id, removedItemId: itemId };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Remove Item from Group")
            : formatErrorResponse(result?.error || 'Failed to remove item from group', "Remove Item from Group");
    }

    /**
     * List all groups on a page
     */
    static async listGroups(args) {
        const { pageIndex } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            const groups = [];
            for (let i = 0; i < page.allPageItems.length; i++) {
                const item = page.allPageItems[i];
                let isGroup = false;
                try {
                    isGroup = typeof item.pageItems !== 'undefined' || item.constructor?.name === 'Group';
                } catch(e) {}
                if (isGroup) {
                    let itemCount = 0;
                    try { itemCount = item.allPageItems.length; } catch(e) {}
                    groups.push({
                        pageItemIndex: i,
                        name: item.name || 'Unnamed',
                        id: item.id,
                        visible: item.visible,
                        locked: item.locked,
                        itemCount,
                        geometricBounds: item.geometricBounds
                    });
                }
            }
            return { success: true, groups, count: groups.length };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "List Groups")
            : formatErrorResponse(result?.error || 'Failed to list groups', "List Groups");
    }

    /**
     * Set group properties
     */
    static async setGroupProperties(args) {
        const { pageIndex, groupIndex, visible, locked, name } = args;

        const code = `
            if (app.documents.length === 0) return { success: false, error: 'No document open' };
            const doc = app.activeDocument;
            if (${pageIndex} < 0 || ${pageIndex} >= doc.pages.length) return { success: false, error: 'Page index out of range' };
            const page = doc.pages.item(${pageIndex});
            if (${groupIndex} < 0 || ${groupIndex} >= page.allPageItems.length) return { success: false, error: 'Group index out of range' };
            const group = page.allPageItems[${groupIndex}];
            let isGroup = false;
            try {
                isGroup = typeof group.pageItems !== 'undefined' || group.constructor?.name === 'Group';
            } catch(e) {}
            if (!isGroup) return { success: false, error: 'Selected item is not a group' };
            if (${visible} !== null && ${visible} !== undefined) group.visible = ${visible};
            if (${locked} !== null && ${locked} !== undefined) group.locked = ${locked};
            if (${JSON.stringify(name)} !== null && ${JSON.stringify(name)} !== undefined) group.name = ${JSON.stringify(name)};
            return { success: true, id: group.id, name: group.name, visible: group.visible, locked: group.locked };
        `;

        const result = await ScriptExecutor.executeViaUXP(code);
        return result?.success
            ? formatResponse(result, "Set Group Properties")
            : formatErrorResponse(result?.error || 'Failed to set group properties', "Set Group Properties");
    }
}
