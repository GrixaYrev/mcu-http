// const fileAddress = ["http://localhost:3939/listget.cgi?num=", "http://localhost:3939/rfid.cgi"];
// const updateAddress = ["http://localhost:3939/updateOCPP"];
// const CommonInfoAddress = 'http://localhost:3939/info.cgi';
const fileAddress = ['/cgi/listget.cgi?num=', '/cgi/rfid.cgi'];
const CommonInfoAddress = '/cgi/info.cgi';
const updateAddress = ['/cgi/listset.cgi?num='];

function getDataFromBoard(responceNumber) {
    let localList = [];
    let finishList = false;
    let listCount = 0;

    switch (responceNumber) {
        case 0:
            requestDataFromBoard(CommonInfoAddress, function (responceText) {
                console.log(responceText);
                showVendorInfo(JSON.parse(responceText));
            });
            break;
        case 1:
            while (!finishList) {
                if (listCount == 0) {
                    createListHeader();
                }

                requestDataFromBoard(fileAddress[0] + listCount, function (responceText) {
                    console.log(responceText);
                    localList = JSON.parse(responceText)['List'];
                    if (localList != null) {
                        addListRows(localList);
                    }
                });

                listCount++;

                if (localList == null || localList.length < 8) {
                    finishList = true;
                }
            }
            showAddNewRowButton();
            showButtons();
            break;
        default:
            break;
    }

}

function createListHeader() {
    let element = document.querySelector(".as1-wrap__info");
    let info = "";
    element.innerHTML = "";
    let localListTable = document.createElement('div');
    localListTable.className = "as1-content__table";
    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title content__cell_center as1-content__cell_number\">#</div>";
    info += "<div class=\"as1-content__cell as1-content__cell_title content__cell_center as1-content__cell_middle\">ID</div>";
    info += "<div class=\"as1-content__cell as1-content__cell_title content__cell_center as1-content__cell_middle\">Note</div>";
    info += "</div>";
    localListTable.innerHTML = info;
    element.appendChild(localListTable);
}

function addListRows(localList) {
    let element = document.querySelector(".as1-content__table");
    let info = "";
    for (let i = 0; i < localList.length; i++) {
        info = "<div class=\"as1-content__row\">";
        info += "<div class=\"as1-content__cell as1-content__cell_number\"></div>";
        info += "<input type=\"text\" class=\"as1-content__settingsInput as1-content__settingsInput_long\" maxlength=\"20\" value=\"" + localList[i]['IdToken'] + "\">";
        localList[i]['Note'] = localList[i]['Note'] ? localList[i]['Note'] : "";
        info += "<input type=\"text\" class=\"as1-content__settingsInput as1-content__settingsInput_long\" maxlength=\"20\" value=\"" + localList[i]['Note'] + "\">";
        info += "<button class=\"as1-content__button_white\" onclick=\"showPopup(this.parentNode)\"><img src=\"img/rfid.png\" alt=\"del\" border=\"0\"></button>";
        info += "<button class=\"as1-content__button_white\" onclick=\"removeRow(this.parentNode)\"><img src=\"img/delete.png\" alt=\"del\" border=\"0\"></button>";
        info += "</div>";
        element.innerHTML += info;
    }
    updateNumbers();
}

function updateNumbers() {
    let element = document.querySelectorAll(".as1-content__table .as1-content__row");
    for (let i = 1; i < element.length; i++) {
        element[i].firstChild.innerHTML = i;
    }
}

function showAddNewRowButton() {
    let element = document.querySelector(".as1-wrap__info");
    let buttonRow = document.createElement('div');
    buttonRow.className = "as1-content__row as1-content__row_center";
    buttonRow.innerHTML = "<button class=\"as1-content__buttonAdd\" onclick=\"addNewRow(this.parentNode)\"><img src=\"img/add.png\" alt=\"add\" border=\"0\"></button>";
    element.appendChild(buttonRow);
}

function showButtons() {
    let element = document.querySelector(".as1-wrap__info");
    let buttonRow = document.createElement('div');
    let buttons = "<div><button class=\"as1-content__button as1-content__button_red\" onclick=\"clearLocalList(false)\">Clear list</button>";
    buttons += "<button class=\"as1-content__button\" onclick=\"updateLocalList()\">Save</button>";
    buttons += "<button class=\"as1-content__button\" onclick=\"exportToCsv()\">Export to CSV</button>";
    buttons += "<button class=\"as1-content__button\" onclick=\"ImportFromCsv()\">Import from CSV</button></div>";
    buttonRow.classList = "as1-content__buttonRow";
    buttonRow.innerHTML += buttons;
    buttonRow.innerHTML += "<div class=\"as1-content__warningText\">Warning! Parameters will save without reboot!</div>";
    element.appendChild(buttonRow);
}

function addNewRow() {
    let element = document.querySelector(".as1-content__table");
    let buttonRow = document.createElement('div');
    buttonRow.className = "as1-content__row";
    buttonRow.innerHTML += "<div class=\"as1-content__cell as1-content__cell_number\"></div>";
    buttonRow.innerHTML += "<input type=\"text\" class=\"as1-content__settingsInput as1-content__settingsInput_long\" maxlength=\"20\" value=\"\">";
    buttonRow.innerHTML += "<input type=\"text\" class=\"as1-content__settingsInput as1-content__settingsInput_long\" maxlength=\"20\" value=\"\">";
    buttonRow.innerHTML += "<button class=\"as1-content__button_white\" onclick=\"showPopup(this.parentNode)\"><img src=\"img/rfid.png\" alt=\"del\" border=\"0\"></button>";
    buttonRow.innerHTML += "<button class=\"as1-content__button_white\" onclick=\"removeRow(this.parentNode) \"><img src=\"img/delete.png\" alt=\"del\" border=\"0\"></button>";
    element.appendChild(buttonRow);
    updateNumbers();
}

function removeRow(element) {
    element.remove();
    updateNumbers();
}

function showPopup(rowElement) {
    let element = document.getElementsByTagName("body");
    let popup = document.createElement('div');
    let info = "";
    popup.className = "as1-body_opacity";
    info = "<div class=\"as1-popup\">";
    info += "<div>Swipe RFID</div>";
    info += "<button class=\"as1-popup__button\" onclick=\"closePopup()\">Cancel</button>";
    info += "</div>";
    popup.innerHTML = info;
    popup.style.height = Math.max(document.body.scrollHeight, document.body.offsetHeight,
        document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
    element[0].appendChild(popup);
    getRFIDID(rowElement, 1);
}

function getRFIDID(rowElement, flag) {
    let cancelButton = document.querySelector(".as1-popup").lastChild;
    let timerId = 0;
    requestDataFromBoard(fileAddress[1], function (responceText) {
        let rfidData = JSON.parse(responceText);
        console.log(responceText);

        if (rfidData['RFID']) {
            if (flag != 1) {
                rowElement.children[1].value = rfidData['RFID'];
                closePopup();
            } else {
                getRFIDID(rowElement, 0);
            }
        } else {
            timerId = setTimeout(getRFIDID, 1000, rowElement, 0);
            cancelButton.onclick = function () { closePopup(timerId) };
        }
    });
}

function closePopup(timerId) {
    let popup = document.querySelector(".as1-body_opacity");
    if (timerId) {
        clearTimeout(timerId);
    }

    popup.remove();
}

function clearLocalList(updateFromFile) {
    if (updateFromFile || confirm("Are you really want to clear the list?")) {
        let table = document.querySelector(".as1-content__table");
        for (let i = table.childElementCount - 1; i >= 1; i--) {
            removeRow(table.childNodes[i]);
        }
    }

}

function updateLocalList() {
    let localListItems = [];
    let localListTable = document.querySelector(".as1-content__table").children;
    let packetCount;
    let failureFlag = false;

    for (let i = 1; i < localListTable.length; i++) {
        let localListItem = {
            IdToken: "",
            Note: null
        }
        localListItem['IdToken'] = localListTable[i].children[1].value;
        localListItem['Note'] = localListTable[i].children[2].value ? localListTable[i].children[2].value : null;
        if (localListTable[i].children[1].value) {
            localListItems.push(localListItem);
        }
    }

    localListItems = uniq(localListItems, 'IdToken');
    packetCount = Math.floor(localListItems.length / 8 + 1);

    if (localListItems.length == 0) {
        let localList = {
            List: null,
        };

        sendJSONToBoard(JSON.stringify(localList), updateAddress[0] + 0, function (responceText) {
            console.log(responceText);
            if (!JSON.parse(responceText)['OK']) {
                failureFlag = true;
            }
        });
    } else {
        for (let i = 0; i < packetCount; i++) {
            if (failureFlag) {
                break;
            }
            let localList = {
                List: '',
            };
            localList['List'] = localListItems.slice(i * 8, i * 8 + 8);

            sendJSONToBoard(JSON.stringify(localList), updateAddress[0] + i, function (responceText) {
                console.log(responceText);
                if (!JSON.parse(responceText)['OK']) {
                    failureFlag = true;
                }
            });
        }
    }
    alert(failureFlag ? "Updating error" : "Updated Succesfully");
    getDataFromBoard(1);
}

function uniq(a, param) {
    return a.filter(function (item, pos, array) {
        return array.map(function (mapItem) { return mapItem[param]; }).indexOf(item[param]) === pos;
    })
}

function exportToCsv() {
    let table = document.querySelector(".as1-content__table");
    let row = "", fullString = "";
    console.log(table);
    row = "IdToken;expiryDate;parentIdTag;status;Note\r\n";
    fullString += row;
    for (let i = 1; i < table.childElementCount; i++) {
        row = table.children[i].children[1].value + ";";
        row += ";;;";
        row += table.children[i].children[2].value;
        row += "\r\n";
        fullString += row;
    }
    console.log(fullString);
    if (window.navigator.msSaveOrOpenBlob) {
        let blob = new Blob([fullString]);
        window.navigator.msSaveOrOpenBlob(blob, 'AS1Tokens.csv');
    } else {
        let a = document.createElement('a');
        a.href = 'data:attachment/csv,' + encodeURIComponent(fullString);
        a.target = '_blank';
        a.download = 'AS1Tokens.csv';
        document.body.appendChild(a);
        a.click();
    }
}

function ImportFromCsv() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;

            let lines = content.split("\r\n");
            let result = [];
            let headers = lines[0].split(";");
            let linesAmount = lines.length;
            for (let i = 1; i < linesAmount; i++) {
                let obj = {};
                if (lines[i].length > 0) {
                    let currentline = lines[i].split(";");
                    obj[headers[0]] = currentline[0].length > 20 ? currentline[0].substring(0, 20) : currentline[0];
                    obj[headers[4]] = currentline[4].length > 20 ? currentline[4].substring(0, 20) : currentline[4];
                    result.push(obj);
                }
            }
            console.log(result);
            if (linesAmount > 0) {
                clearLocalList(true);
                addListRows(result);
            }
        }
    }
    input.click();
}