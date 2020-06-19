

function formatHours(hours, min) {
    let frm = (x) => ("0" + x).slice(-2);
    return frm(hours) + ":" + frm(min);
}

class Timetable {
    constructor(cal, minHour, maxHour) {
        this.calendar = $(cal).find('tbody');
        if(this.calendar.length === 0){ //no tbody present
            $(cal).append('<tbody></tbody>');
            this.calendar = $(cal).find('tbody');
        }

        this.minHour = minHour;
        this.maxHour = maxHour;

        this.blocks = {};
        this.events = [];
        this.lockedDays = [];

        this.blockStates = {};

        this.lang = navigator.language || navigator.userLanguage;

        this.init(cal);
    }

    _DAYS = { 
        it: ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'],
        en: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    }

    getDaysTranslated(){
        let days = this._DAYS.en;
        if(this.lang in Object.keys(this._DAYS))
            days = this._DAYS[this.lang];
        return days;
    }

    init() {
        this.calendar.addClass('cal-tbody');

        let days = this.getDaysTranslated();

        this.calendar.append(`        
            <tr>
                <td class="col-time">&nbsp;</td>
                <td class="col-day cal-heading">${days[0]}</td>
                <td class="col-day cal-heading">${days[1]}</td>
                <td class="col-day cal-heading">${days[2]}</td>
                <td class="col-day cal-heading">${days[3]}</td>
                <td class="col-day cal-heading">${days[4]}</td>
                <td class="col-day cal-heading">${days[5]}</td>
            </tr>`);

        for (let ora = this.minHour; ora <= this.maxHour; ora++) {
            for (let interval = 0; interval < 60; interval += 5) {
                let rowClass = '';
                let firstCell = '';
                let rowspan = 12;

                if (interval === 0) {
                    let lblOra = formatHours(ora, interval);
                    rowClass = 'cal-row-top';
                    firstCell = `<td rowspan="${rowspan}" class="col-time cal-cell cal-time">${lblOra}</td>`;
                }
                this.calendar.append(`
                    <tr class="${rowClass}">
                    ${firstCell}
                    <td data-day="0" class="col-day cal-cell"></td>
                    <td data-day="1" class="col-day cal-cell"></td>
                    <td data-day="2" class="col-day cal-cell"></td>
                    <td data-day="3" class="col-day cal-cell"></td>
                    <td data-day="4" class="col-day cal-cell"></td>
                    <td data-day="5" class="col-day cal-cell"></td>
                    </tr>
                `);
            }
        }
    }

    calcRowIndex(time) {
        return Math.round((time.hours - this.minHour) * 12 + time.min / 5 + 1)
    }

    addBlock(block, clickFn) {
        let rowStart = this.calcRowIndex(block.startTime);
        let rowEnd = this.calcRowIndex(block.endTime);

        let startElem = $(this.calendar.children()[rowStart]).find(`td[data-day=${block.day}]`);
        startElem.attr('rowspan', rowEnd - rowStart);


        block.blockStates = this.blockStates;
        this.blocks[block.id] = block;

        //hide the following rows
        for (let i = rowStart + 1; i < rowEnd; i++) {
            $(this.calendar.children()[i]).find(`td[data-day=${block.day}]`).hide();
        }

        block.htmlElement = startElem.append(block.getHTML()).children().first();

        block.setOnClick(clickFn);
        
        block.htmlElement.css('height', 6 * (rowEnd - rowStart) + 'px'); //adjust the size of the cell to fit the parent
    }

    getBlock(blockId) {
        return this.blocks[blockId];
    }
    resetAllBlocksStates() {
        for (let bId of Object.keys(this.blocks)) {
            let block = this.blocks[bId];
            block.setStateNormal();
        }
    }
    deleteAllBlocks(){
        for (let bId of Object.keys(this.blocks)) {
            let block = this.blocks[bId];
            block.delete();
        }
        this.blocks = {};
    }
    deleteAllEvents(){
        for (let bId of Object.keys(this.blocks)) {
            let block = this.blocks[bId];
            block.deleteAllEvents();
        }
    }
    addEvent(event, blockId, clickFn, deleteFn) {
        let block = this.blocks[blockId];

        block.addEvent(event, clickFn, deleteFn);
    }
    lockDay(dayOfWeek, text){
        let blockLocked = new Block("Lock" + dayOfWeek, text, dayOfWeek, { hours: this.minHour, min: 0 }, { hours: this.maxHour + 1, min: 0 });
        blockLocked.locked = true;
        this.addBlock(blockLocked);
    }
    setDays(startDate){
        let headers = this.calendar.children().first().children();
        let days = this.getDaysTranslated();
        let frm = (x) => ("0" + x).slice(-2);

        let date = new Date(startDate);

        for(let i = 1; i < headers.length; i++){
            let dateStr = frm(date.getDate()) + "/" + frm(date.getMonth() + 1);
            $(headers[i]).text(days[i-1] + " " + dateStr);
            date = new Date(date.setDate(date.getDate() + 1));            
        }
    }
    setMapOfBlockStates(blockStates){
        this.blockStates = blockStates;
    }
}

class Block {
    constructor(id, text, day, startTime, endTime, deletable=false) {
        this.id = id;
        this.text = text;
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;
        this.deletable = deletable;
        this.locked = false;

        this.events = [];

        this.htmlElement = null;
    }

    getHTML() {
        let deleteBtn = '';
        if(this.deletable)
            deleteBtn = '<span class="cal-btn-del">x</span>';

        let hoursText = '';
        let blockClass = '';
        if(!this.locked)
            hoursText = `<div class="cal-block-cells">${formatHours(this.startTime.hours, this.startTime.min)} - ${formatHours(this.endTime.hours, this.endTime.min)}</div>`;
        else
            blockClass = 'cal-locked-day';

        let el = $(`
            <div class="row">
                <div class="col-12 cal-block ${blockClass}">
                    <div class="cal-block-cells">
                        <p class="cal-block-text">${this.text}</p>
                    </div>
                    ${hoursText}

                    ${deleteBtn}
                </div>
            </div>`);

        if(this.deletable){
            el.find('.cal-btn-del').click((e) => {
                this.delete();
            });
        }

        return el;
    }
    setOnClick(onClick) {
        let blockHtml = this._getBlockHtmlElement();
        this.onClick = onClick;
        blockHtml.unbind("click");

        if (onClick !== undefined)
            blockHtml.click(() => {
                onClick(this)
            });
    }
    _getBlockHtmlElement() {
        return this.htmlElement.children().last();
    }
    setState(blockState) {
        if(this.locked)
            return;

        let blockHtml = this._getBlockHtmlElement();
        blockHtml.show();
        this._adjustColsWeight(true);

        for(let i of Object.keys(this.blockStates)){
            blockHtml.removeClass(this.blockStates[i]);
        }
        blockHtml.addClass(this.blockStates[blockState]);
    }
    setStateNormal() {
        let blockHtml = this._getBlockHtmlElement();
        this._adjustColsWeight();

        for(let i of Object.keys(this.blockStates)){
            blockHtml.removeClass(this.blockStates[i]);
        }

        blockHtml.unbind("click");
    }
    delete(){
        let tableCell = this.htmlElement.parent();
        let rowspan = tableCell.attr("rowspan");
        let day = tableCell.attr("data-day");

        let nextRow = tableCell.parent().next();
        for(let i = 0; i < rowspan; i++){
            nextRow.find(`td[data-day=${day}]`).show();
            nextRow = nextRow.next();
        }

        tableCell.removeAttr("rowspan");
        this.htmlElement.remove();
    }
    addEvent(event, clickFn, deleteFn) {
        event.attachToBlock(this);
        this.events.push(event);

        let blockHtmlElement = this._getBlockHtmlElement();
        //blockHtmlElement.hide();

        //insert the event block
        blockHtmlElement.before(event.getHTML());
        let newEventBlock = blockHtmlElement.prev();
        newEventBlock.hide();

        //fix the col-* bootstrap class
        this._adjustColsWeight();

        newEventBlock.show(); //to fix wrong height

        event.htmlElement = newEventBlock;
        event.setOnClick(clickFn);
        event.setOnDelete(deleteFn);
    }
    deleteEvent(event) {
        this.events = this.events.filter(ev => ev.id !== event.id);

        let blockHtmlElement = this._getBlockHtmlElement();
        blockHtmlElement.hide();

        //delete the event block html
        event.htmlElement.remove();

        //fix the col-* bootstrap class
        this._adjustColsWeight();
    }
    deleteAllEvents() {
        for(let event of this.events){
            this.deleteEvent(event);
        }
    }
    _adjustColsWeight(countNewBlock = false) {
        let numChildren = this.events.length;

        if (countNewBlock || this.events.length === 0) {
            this._getBlockHtmlElement().show();
            numChildren += 1; //counts event the empty block for insert
        } else {
            this._getBlockHtmlElement().hide();
        }

        let colDim = Math.floor(12 / numChildren);
        for (let chIdx = 0; chIdx < numChildren; chIdx++) {
            let child = this.htmlElement.children()[chIdx];
            let classes = $(child).attr("class").split(" ");
            for (let cssClass of classes) {
                if (cssClass.startsWith("col-"))
                    $(child).removeClass(cssClass);
            }
            if (chIdx === numChildren - 1) {
                colDim = 12 - (chIdx * colDim);
                $(child).addClass(`col-${colDim}`);
            } else {
                $(child).addClass(`col-${colDim}`);
            }
        }
    }
}

class Event {
    constructor(id, teacher, lecture) {
        this.id = id;
        this.teacher = teacher;
        this.lecture = lecture;

        this.htmlElement = null;
        this.onClick = null;
        this.onDelete = null;
    }

    attachToBlock(block) {
        this.block = block;
    }
    setOnClick(onClick) {
        this.onClick = onClick;
        this.htmlElement.unbind("click");

        if (onClick !== undefined)
            this.htmlElement.click(() => {
                onClick(this)
            });
    }
    setOnDelete(onDelete) {
        this.onDelete = onDelete;
    }

    getHTML() {
        let el = $(`
            <div class="col-12 cal-block cal-event">
                <div class="cal-event-cells">${this.teacher}</div>
                <div class="cal-event-cells">${this.lecture}</div>
                <div class="cal-event-cells">${formatHours(this.block.startTime.hours, this.block.startTime.min)} - ${formatHours(this.block.endTime.hours, this.block.endTime.min)}</div>
                <span class="cal-btn-del">x</span>
            </div>`);

        el.find('.cal-btn-del').click(() => {
            let res = true;
            if(this.onDelete !== undefined)
                res = this.onDelete(this);
            if(res)
                this.block.deleteEvent(this);
        });

        if (this.onDelete === null || this.onDelete === undefined)
            el.find('.cal-btn-del').hide();

        return el;
    }
}
