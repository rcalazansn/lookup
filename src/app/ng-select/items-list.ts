import { NgOption } from './ng-select.types';
import * as searchHelper from './search-helper';
import { NgSelectComponent } from './ng-select.component';
import { isObject, isDefined, isFunction } from './value-utils';
import { newId } from './id';

type OptionGroups = Map<string, NgOption[]>;

export class ItemsList {

    private _items: NgOption[] = [];
    private _filteredItems: NgOption[] = [];
    private _groups: OptionGroups;
    private _markedIndex = -1;
    private _selected: NgOption[] = [];

    constructor(private _ngSelect: NgSelectComponent) { }

    get items(): NgOption[] {
        return this._items;
    }

    get filteredItems(): NgOption[] {
        return this._filteredItems;
    }

    get value(): NgOption[] {
        return this._selected;
    }

    get markedItem(): NgOption {
        return this._filteredItems[this._markedIndex];
    }

    get markedIndex(): number {
        return this._markedIndex;
    }

    get noItemsToSelect(): boolean {
        return this._ngSelect.hideSelected && this._items.length === this._selected.length;
    }

    get maxItemsSelected(): boolean {
        return this._ngSelect.multiple && this._ngSelect.maxSelectedItems <= this._selected.length;
    }

    get lastSelectedItem() {
        return this._selected[this._selected.length - 1];
    }

    setItems(items: any[]) {
        this._items = items.map((item, index) => this.mapItem(item, index));
        if (this._ngSelect.groupBy) {
            this._groups = this._groupBy(this._items, this._ngSelect.groupBy);
            this._items = this._flatten(this._groups);
        } else {
            this._groups = new Map();
            this._groups.set(undefined, this._items)
        }
        this._filteredItems = [...this._items];
    }

    select(item: NgOption) {
        if (item.selected || this.maxItemsSelected) {
            return;
        }
        if (!this._ngSelect.multiple) {
            this.clearSelected();
        }
        this._selected.push(item);
        item.selected = true;

        if (this._ngSelect.hideSelected) {
            this._filteredItems = this._filteredItems.filter(x => x !== item);
        }
    }

    findItem(value: any): NgOption {
        let findBy: (item: NgOption) => boolean;
        if (this._ngSelect.compareWith) {
            findBy = item => this._ngSelect.compareWith(item.value, value) 
        } else if (this._ngSelect.bindValue) {
            findBy = item => !item.hasChildren && this.resolveNested(item.value, this._ngSelect.bindValue) === value
        } else {
            findBy = item => item.value === value ||
                    !item.hasChildren && item.label && item.label === this.resolveNested(value, this._ngSelect.bindLabel)
        }
        return this._items.find(item => findBy(item));
    }

    unselect(item: NgOption) {
        this._selected = this._selected.filter(x => x !== item);
        item.selected = false;

        if (this._ngSelect.hideSelected && isDefined(item.index)) {
            this._filteredItems.splice(item.index, 0, item);
            this._filteredItems = [...this._filteredItems.sort((a, b) => (a.index - b.index))];
        }
    }

    addItem(item: any) {
        const option = this.mapItem(item, this._items.length);
        this._items.push(option);
        this._filteredItems.push(option);
        return option;
    }

    clearSelected() {
        this._selected.forEach((item) => {
            item.selected = false;
            item.marked = false;
        });
        this._selected = [];

        if (this._ngSelect.hideSelected) {
            this.resetItems();
        }
    }

    findByLabel(term: string) {
        term = searchHelper.stripSpecialChars(term).toLocaleLowerCase();
        return this.filteredItems.find(item => {
            const label = searchHelper.stripSpecialChars(item.label).toLocaleLowerCase();
            return label.substr(0, term.length) === term;
        });
    }

    filter(term: string) {
        if (!term) {
            this.resetItems();
            return;
        }

        this._filteredItems = [];
        term = this._ngSelect.searchFn ? term : searchHelper.stripSpecialChars(term).toLocaleLowerCase();
        const match = this._ngSelect.searchFn || this._defaultSearchFn;

        for (const key of Array.from(this._groups.keys())) {
            const matchedItems = [];
            for (const item of this._groups.get(key)) {
                if (this._ngSelect.hideSelected && this._selected.indexOf(item) > -1) {
                    continue;
                }
                const searchItem = this._ngSelect.searchFn ? item.value : item;
                if (match(term, searchItem)) {
                    matchedItems.push(item);
                }
            }
            if (matchedItems.length > 0) {
                const [last] = matchedItems.slice(-1);
                if (last.parent) {
                    const head = this._items.find(x => x === last.parent);
                    this._filteredItems.push(head);
                }
                this._filteredItems.push(...matchedItems);
            }
        }
    }

    resetItems() {
        if (this._filteredItems.length === this._items.length) {
            return;
        }
        this._filteredItems = this._ngSelect.hideSelected ?
            this._items.filter(x => this._selected.indexOf(x) === -1) :
            this._items;
    }

    unmarkItem() {
        this._markedIndex = -1;
    }

    markNextItem() {
        this._stepToItem(+1);
    }

    markPreviousItem() {
        this._stepToItem(-1);
    }

    markItem(item: NgOption) {
        this._markedIndex = this._filteredItems.indexOf(item);
    }

    markSelectedOrDefault(markDefault?: boolean) {
        if (this._filteredItems.length === 0) {
            return;
        }
        const indexOfLastSelected = this._ngSelect.hideSelected ? -1 : this._filteredItems.indexOf(this.lastSelectedItem);
        if (this.lastSelectedItem && indexOfLastSelected > -1) {
            this._markedIndex = indexOfLastSelected;
        } else {
            this._markedIndex = markDefault ? this.filteredItems.findIndex(x => !x.disabled) : -1;
        }
    }

    resolveNested(option: any, key: string): any {
        if (!isObject(option)) {
            return option;
        }
        if (key.indexOf('.') === -1) {
            return option[key];
        } else {
            let keys: string[] = key.split('.');
            let value = option;
            for (let i = 0, len = keys.length; i < len; ++i) {
                if (value == null) {
                    return null;
                }
                value = value[keys[i]];
            }
            return value;
        }
    }

    mapItem(item: any, index: number): NgOption {
        let label = '';
        if (isDefined(item.label)) {
            label = item.label;
        } else {
            label = this.resolveNested(item, this._ngSelect.bindLabel);
            label = isDefined(label) ? label.toString() : '';
        }
        const value = isDefined(item.$ngOptionValue) ? item.$ngOptionValue : item;
        return {
            index: index,
            label: label,
            value: value,
            disabled: item.disabled,
            htmlId: newId()
        };
    }

    mapSelectedItems() {
        this._selected.forEach((selected, i) => {
            const value = this._ngSelect.bindValue ? selected.value[this._ngSelect.bindValue] : selected.value;
            const item = this.findItem(value);
            if (item && selected !== item) {
                item.selected = true;
                this._selected[i] = item;
            }
        });

        if (this._ngSelect.hideSelected) {
            this._filteredItems = this.filteredItems.filter(x => this._selected.indexOf(x) === -1);
        }
    }

    private _defaultSearchFn(search: string, opt: NgOption) {
        const label = searchHelper.stripSpecialChars(opt.label).toLocaleLowerCase();
        return label.indexOf(search) > -1
    }

    private _getNextItemIndex(steps: number) {
        if (steps > 0) {
            return (this._markedIndex === this._filteredItems.length - 1) ? 0 : (this._markedIndex + 1);
        }
        return (this._markedIndex <= 0) ? (this._filteredItems.length - 1) : (this._markedIndex - 1);
    }

    private _stepToItem(steps: number) {
        if (this._filteredItems.length === 0 || this._filteredItems.every(x => x.disabled)) {
            return;
        }

        this._markedIndex = this._getNextItemIndex(steps);
        if (this.markedItem.disabled) {
            this._stepToItem(steps);
        }
    }

    private _groupBy(items: NgOption[], prop: string | Function): OptionGroups {
        const isFn = isFunction(this._ngSelect.groupBy);
        const groups = new Map<string, NgOption[]>();
        for (const item of items) {
            let key = isFn ? (<Function>prop).apply(this, [item.value]) : item.value[<string>prop];
            key = isDefined(key) ? key : undefined;
            const group = groups.get(key);
            if (group) {
                group.push(item);
            } else {
                groups.set(key, [item]);
            }
        }
        return groups;
    }

    private _flatten(groups: OptionGroups) {
        const isFn = isFunction(this._ngSelect.groupBy);
        const items = [];
        const withoutGroup = groups.get(undefined) || [];
        items.push(...withoutGroup);
        let i = withoutGroup.length;
        for (const key of Array.from(groups.keys())) {
            if (!isDefined(key)) {
                continue;
            }
            const parent: NgOption = {
                label: key,
                hasChildren: true,
                index: i++,
                disabled: !this._ngSelect.selectableGroup,
                htmlId: newId()
            };
            const groupKey = isFn ? this._ngSelect.bindLabel : this._ngSelect.groupBy;
            parent.value = { [groupKey]: key };
            items.push(parent);

            const children = groups.get(key).map(x => {
                x.parent = parent;
                x.hasChildren = false;
                x.index = i++;
                return x;
            });
            items.push(...children);
        }
        return items;
    }
}
