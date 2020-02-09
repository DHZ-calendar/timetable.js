

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

        this.init(cal);
    }

    _DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']

    init() {
        this.calendar.addClass('cal-tbody');

        this.calendar.append(`        
            <tr>
                <td class="col-time">&nbsp;</td>
                <td class="col-day cal-heading">${this._DAYS[0]}</td>
                <td class="col-day cal-heading">${this._DAYS[1]}</td>
                <td class="col-day cal-heading">${this._DAYS[2]}</td>
                <td class="col-day cal-heading">${this._DAYS[3]}</td>
                <td class="col-day cal-heading">${this._DAYS[4]}</td>
                <td class="col-day cal-heading">${this._DAYS[5]}</td>
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

        block.htmlElement = startElem.append(block.getHTML()).children().first();

        this.blocks[block.id] = block;

        block.htmlElement.css('height', startElem.height()); //adjust the size of the cell to fit the parent

        block.setOnClick(clickFn);

        for (let i = rowStart + 1; i < rowEnd; i++) {
            $(this.calendar.children()[i]).find(`td[data-day=${block.day}]`).hide();
        }
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
    addEvent(event, blockId, clickFn) {
        let block = this.blocks[blockId];

        block.addEvent(event, clickFn);
    }
}

class Block {
    constructor(id, text, day, startTime, endTime) {
        this.id = id;
        this.text = text;
        this.day = day;
        this.startTime = startTime;
        this.endTime = endTime;

        this.events = [];

        this.htmlElement = null;
    }

    getHTML() {
        return `
            <div class="row">
                <div class="col-12 cal-block">
                <div class="cal-block-cells">${this.text}</div>
                <div class="cal-block-cells">${formatHours(this.startTime.hours, this.startTime.min)} - ${formatHours(this.endTime.hours, this.endTime.min)}</div>
                </div>
            </div>`;
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
    setStateAvailable() {
        let blockHtml = this._getBlockHtmlElement();
        if (blockHtml.attr("data-event") == undefined) {
            blockHtml.show();
            this._adjustColsWeight(true);
            blockHtml.addClass('cal-block-available');
            blockHtml.removeClass('cal-block-denied');
        }
    }
    setStateDenied() {
        let blockHtml = this._getBlockHtmlElement();
        if (blockHtml.attr("data-event") == undefined) {
            blockHtml.show();
            this._adjustColsWeight();
            blockHtml.addClass('cal-block-denied');
            blockHtml.removeClass('cal-block-available');
        }
    }
    setStateNormal() {
        let blockHtml = this._getBlockHtmlElement();
        if (blockHtml.attr("data-event") == undefined) { //TODO: change
            this._adjustColsWeight();
            blockHtml.removeClass('cal-block-denied');
            blockHtml.removeClass('cal-block-available');
            blockHtml.unbind("click");
        }
    }
    addEvent(event, clickFn) {
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
    getHTML() {
        let el = $(`
            <div class="col-12 cal-block cal-event">
            <div class="cal-event-cells">${this.teacher}</div>
            <div class="cal-event-cells">${this.lecture}</div>
            <div class="cal-event-cells">${formatHours(this.block.startTime.hours, this.block.startTime.min)} - ${formatHours(this.block.endTime.hours, this.block.endTime.min)}</div>
            <span class="cal-btn-del">x</span>
            </div>`);

        el.find('.cal-btn-del').click(() => {
            this.block.deleteEvent(this);
        });

        return el;
    }
}