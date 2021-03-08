// const fileAddress = ['http://localhost:3939/info.cgi', 'http://localhost:3939/channel1.cgi', 'http://localhost:3939/channel2.cgi', 'http://localhost:3939/state.cgi', 'http://localhost:3939/counter1.cgi', 'http://localhost:3939/counter2.cgi', 'http://localhost:3939/counter3.cgi'];
const fileAddress = ['/cgi/info.cgi', '/cgi/channel.cgi?con=1', '/cgi/channel.cgi?con=2', '/cgi/state.cgi', '/cgi/meter.cgi?con=0', '/cgi/meter.cgi?con=1', '/cgi/meter.cgi?con=2'];

let generalInfo;
const GeneralInfoTitles = ['Time', 'Date', 'Bright', 'OCPP', 'Link', 'Boot'];
const CounterTitles = ['Enable', 'Identifier', 'Current, A', 'Voltage, V', 'Power, kW', 'Energy, kWh'];
const ChannelGeneralTitles = ['Status', 'Error', 'Connected EV', 'Transaction ID', 'IdTag', 'Current limit, A', 'Block Active'];
const ChannelExtendedTitles = ['Link', 'State', 'Error', 'Last State', 'Last Error', 'Last Voltage CP', 'Current Limit', 'Current Limit RDIP', 'Current Limit Cable', 'Block Error', 'Lock', 'Out AC'];


function getDataFromBoard(responceNumber) {
    switch (responceNumber) {
        case 0:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                console.log(responceText);
                generalInfo = JSON.parse(responceText);
                showVendorInfo(generalInfo);
                generalInfo['Time'] = Date.parse(generalInfo['Time']);

                createBoardInfoBlock();
                createCounterBlock();
                createChannelBlock();

                updateTime();
                getDataFromBoard(3);
                getDataFromBoard(1);
                getDataFromBoard(4);
                getDataFromBoard(5);
                if (generalInfo['ConnAmount'] > 1) {
                    getDataFromBoard(2);
                    getDataFromBoard(6);
                }
            });
            break;
        case 1:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let extendedInfoNum = 6;
                let channelInfo = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(channelInfo).forEach(function (item, i) {
                    data.push(channelInfo[item]);
                    if (item = "Low") {
                        extendedInfoNum = i;
                    }
                });
                updateChannelStatus(data, 1);
                updateChannelExtendedStatus(data[extendedInfoNum], 1);
            });
            setTimeout(getDataFromBoard, 3000, 1);
            break;
        case 2:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let extendedInfoNum = 6;
                let channelInfo = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(channelInfo).forEach(function (item, i) {
                    data.push(channelInfo[item]);
                    if (item = "Low") {
                        extendedInfoNum = i;
                    }
                });
                updateChannelStatus(data, 2);
                updateChannelExtendedStatus(data[extendedInfoNum], 2);
            });
            setTimeout(getDataFromBoard, 3000, 2);
            break;
        case 3:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let OCPPState = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(OCPPState).forEach(function (item) {
                    data.push(OCPPState[item]);
                });
                updateLinkStatus(data);
            });
            break;
        case 4:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let meterNum = generalInfo['ConnAmount'] > 1 ? 2 : 1;
                let counterInfo = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(counterInfo).forEach(function (item) {
                    data.push(counterInfo[item]);
                });

                if (document.getElementsByClassName("as1-content__counter")[meterNum].firstChild.innerHTML.length > 0) {
                    updateCounterStatus(data, meterNum);
                    if (counterInfo['Enable']) {
                        if (generalInfo['ConnAmount'] > 1) {
                            setTimeout(getDataFromBoard, 9000, 4);
                        } else {
                            setTimeout(getDataFromBoard, 6000, 4);
                        }
                    }
                } else {
                    updateCounterStatus(data, meterNum);
                    if (counterInfo['Enable']) {
                        setTimeout(getDataFromBoard, 3000, 4);
                    }
                }
            });

            break;
        case 5:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let counterInfo = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(counterInfo).forEach(function (item) {
                    data.push(counterInfo[item]);
                });

                if (document.getElementsByClassName("as1-content__counter")[0].firstChild.innerHTML.length > 0) {
                    updateCounterStatus(data, 0);
                    if (counterInfo['Enable']) {
                        if (generalInfo['ConnAmount'] > 1) {
                            setTimeout(getDataFromBoard, 9000, 5);
                        } else {
                            setTimeout(getDataFromBoard, 6000, 5);
                        }
                    }
                } else {
                    updateCounterStatus(data, 0);
                    if (counterInfo['Enable']) {
                        setTimeout(getDataFromBoard, 6000, 5);
                    }
                }
            });

            break;
        case 6:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let counterInfo = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(counterInfo).forEach(function (item) {
                    data.push(counterInfo[item]);
                });

                if (document.getElementsByClassName("as1-content__counter")[1].firstChild.innerHTML.length > 0) {
                    updateCounterStatus(data, 1);
                    if (counterInfo['Enable']) {
                        if (generalInfo['ConnAmount'] > 1) {
                            setTimeout(getDataFromBoard, 9000, 6);
                        } else {
                            setTimeout(getDataFromBoard, 6000, 6);
                        }
                    }
                } else {
                    updateCounterStatus(data, 1);
                    if (counterInfo['Enable']) {
                        setTimeout(getDataFromBoard, 3000, 6);
                    }
                }
            });

            break;
        default:
            break;
    }
}

function createBoardInfoBlock() {
    let element = document.querySelector(".as1-wrap__info");
    let info = "";
    let boardInfoBlock = document.createElement('div');

    boardInfoBlock.className = "as1-content__table";

    info += "<div class=\"as1-content__row as1-content__commonInfo\">";

    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < 3; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + GeneralInfoTitles[i] + "</div>";
    }
    info += "</div>";

    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < 3; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
    }
    info += "</div>";

    info += "<div class=\"as1-content__columnEmpty\"></div>";

    info += "<div class=\"as1-content__column\">";
    for (let i = 3; i < 6; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + GeneralInfoTitles[i] + "</div>";
    }
    info += "</div>";

    info += "<div class=\"as1-content__column\">";
    for (let i = 3; i < 6; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
    }
    info += "</div>";

    boardInfoBlock.innerHTML = info;
    element.appendChild(boardInfoBlock);
}

function createChannelBlock() {
    let element = document.querySelector(".as1-wrap__info");
    let info = "";
    let channelInfoBlock = document.createElement('div');

    channelInfoBlock.className = "as1-content__table";
    info = "<div class=\"as1-content__emptyRow\"></div>";
    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_emptyTitle\"></div>";
    info += "<div class=\"as1-content__cell\">Connector 1</div>";
    if (generalInfo['ConnAmount'] > 1) {
        info += "<div class=\"as1-content__cell\">Connector 2</div>";
    }
    info += "</div>";

    info += "<div class=\"as1-content__row as1-content__channel\">";
    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < ChannelGeneralTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + ChannelGeneralTitles[i] + "</div>";
    }
    info += "</div>";

    for (let i = 0; i < generalInfo['ConnAmount']; i++) {
        info += "<div class=\"as1-content__column\">";
        for (let j = 0; j < ChannelGeneralTitles.length; j++) {
            info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
        }
        info += "</div>";
    }
    info += "</div>";

    info += "<details class=\"as1-content__details\">";
    info += "<summary class=\"as1-content__expand\">Show low board data info</summary>";

    info += "<div class=\"as1-content__row as1-content__extendedChannel\">";
    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < ChannelExtendedTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + ChannelExtendedTitles[i] + "</div>";
    }
    info += "</div>";

    for (let i = 0; i < generalInfo['ConnAmount']; i++) {
        info += "<div class=\"as1-content__column\">";
        for (let j = 0; j < ChannelExtendedTitles.length; j++) {
            info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
        }
        info += "</div>";
    }
    info += "</div>";
    info += "</details>";

    channelInfoBlock.innerHTML = info;

    element.appendChild(channelInfoBlock);
}

function createCounterBlock() {
    let countersBlock = document.createElement('div');
    let element = document.querySelector(".as1-wrap__info");
    let info = "";

    countersBlock.className = "as1-content__table";
    info = "<div class=\"as1-content__emptyRow\"></div>";
    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_emptyTitle\"></div>";
    info += "<div class=\"as1-content__cell\">Meter 1</div>";
    if (generalInfo['ConnAmount'] > 1) {
        info += "<div class=\"as1-content__cell\">Meter 2</div>";
    }
    info += "<div class=\"as1-content__cell\">Main meter</div>";
    info += "</div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < CounterTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + CounterTitles[i] + "</div>";
    }
    info += "</div>";

    for (let i = 0; i <= generalInfo['ConnAmount']; i++) {
        info += "<div class=\"as1-content__column as1-content__counter\">";
        for (let j = 0; j < CounterTitles.length; j++) {
            info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
        }
        info += "</div>";
    }

    info += "</div></div>";
    countersBlock.innerHTML = info;


    element.appendChild(countersBlock);
}

function updateChannelStatus(data, channelNum) {
    let elements = document.querySelector(".as1-content__channel").children[channelNum];
    let info = "";

    for (let i = 0; i < ChannelGeneralTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_data\">" + data[i] + "</div>";
    }

    elements.innerHTML = info;
}

function updateChannelExtendedStatus(data, channelNum) {
    let elements = document.querySelector(".as1-content__extendedChannel").children[channelNum];
    let channelExtendedInfoData = [];
    let info = "";

    data['LastVoltCP'] /= 10;
    Object.keys(data).forEach(function (item) {
        channelExtendedInfoData.push(data[item]);
    });

    for (let i = 0; i < ChannelExtendedTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_data\">" + channelExtendedInfoData[i] + "</div>";
    }
    elements.innerHTML = info;
}

function updateCounterStatus(data, counterNum) {
    let elements = document.getElementsByClassName("as1-content__counter")[counterNum];
    let info = "";

    for (let i = 0; i < CounterTitles.length; i++) {
        info += "<div class=\"as1-content__cell as1-content__cell_data\">";
        info += Array.isArray(data[i]) ? data[i].join('/') : data[i];
        info += "</div>";
    }

    elements.innerHTML = info;
}

function updateTime() {
    let date = new Date(generalInfo['Time']);

    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    if (day < 10) {
        day = "0" + day;
    }
    if (month < 10) {
        month = "0" + month;
    }

    document.getElementsByClassName("as1-content__commonInfo")[0].children[1].children[0].innerHTML = hours + ":" + minutes + ":" + seconds;
    document.getElementsByClassName("as1-content__commonInfo")[0].children[1].children[1].innerHTML = day + "." + month + "." + year;

    generalInfo['Time'] += 1000;
    setTimeout(updateTime, 1000);
}

function updateLinkStatus(OCPPStateData) {
    let OCPPState = document.getElementsByClassName("as1-content__commonInfo")[0].children[4].children;
    OCPPState[0].innerHTML = generalInfo['OCPPEnable'] ? "Enable" : "Disable";
    if (generalInfo['OCPPEnable']) {
        if (OCPPStateData[0] == true) {
            OCPPState[1].innerHTML = generalInfo['OCPPServer'];
        } else {
            OCPPState[1].innerHTML = "Offline";
        }

        if (OCPPStateData[1] == true) {
            OCPPState[2].innerHTML = "Registered";
        } else {
            OCPPState[2].innerHTML = "Unregistered";
        }
    }

    document.getElementsByClassName("as1-content__commonInfo")[0].children[1].children[2].innerHTML = OCPPStateData[2];
    setTimeout(getDataFromBoard, 3000, 3);
}

function expandExtendedInfo() {
    element = document.querySelector(".as1-content__extendedChannel");
    if (element.classList.contains('as1-content__channel-hidden')) {
        element.classList.remove('as1-content__channel-hidden');
    } else {
        element.classList.add('as1-content__channel-hidden');
    }
}
