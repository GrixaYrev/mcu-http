// const fileAddress = ['http://localhost:3939/hrdwrset.cgi', 'http://localhost:3939/timeset.cgi', 'http://localhost:3939/networkset.cgi', 'http://localhost:3939/ocppgen.cgi', 'http://localhost:3939/ocppkey.cgi?key=', 'http://localhost:3939/llprmget.cgi'];
// const updateAddress = ['http://localhost:3939/updateEcho', 'http://localhost:3939/updateEcho', 'http://localhost:3939/updateEcho', 'http://localhost:3939/updateOCPP', 'http://localhost:3939/control', 'http://localhost:3939/updateEcho'];
// const CommonInfoAddress = 'http://localhost:3939/info.cgi';
const fileAddress = ['/cgi/hrdwrget.cgi', '/cgi/timeget.cgi', '/cgi/ntwrget.cgi', '/cgi/ocppgen.cgi', '/cgi/ocppkey.cgi?key=', '/cgi/llprmget.cgi'];
const updateAddress = ['/cgi/hrdwrset.cgi', '/cgi/timeset.cgi', '/cgi/ntwrset.cgi', '/cgi/ocppkeyset.cgi', '/cgi/control.cgi', '/cgi/llprmset.cgi'];
const CommonInfoAddress = '/cgi/info.cgi';

const phases = ['Phase A', 'Phase B', 'Phase C', 'Three-phase'];
const HardwareSettingsTitles = ['Vendor:', 'Model:', 'Serial:', 'RFID:', 'Main meter:', 'Connectors amount:', 'Phases', 'Current limit, A', 'Cable retention lock:', 'Meter'];
const NetworkSettingsTitles = ['IP', 'Mask', 'Gate', 'MAC', 'OCPP Enable', 'OCPP Server', 'OCPP Port', 'OCPP Path', 'OCPP ID', 'OCPP Timeout', 'UDP Logging', 'UDP Logging Port'];
const localListSettingsTitles = ["Authorization without OCPP", "Access with any card", "Enable Hard ID", "Hard ID"];
let boardTime;
let CSL;
let NetworkSettingsData;

function changeTabHandler() {
    let menuItems = document.getElementsByName("radioTab");
    let sectionItems = document.querySelectorAll("section");
    for (let i = 0; i < 5; i++) {
        if (menuItems[i].checked) {
            sectionItems[i].classList.remove("as1-tabs__element-hidden");
            sectionItems[i].classList.add("as1-tabs__element-active");
        } else {
            sectionItems[i].classList.add("as1-tabs__element-hidden");
            sectionItems[i].classList.remove("as1-tabs__element-active");
        }
    }
}

function getDataFromBoard(responceNumber, keyNumber) {
    switch (responceNumber) {
        case 0:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                let HardwareSettingsData = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(HardwareSettingsData).forEach(function (item, i) {
                    data.push(HardwareSettingsData[item]);
                });

                showHardwareSettingsView(data);
            });

            requestDataFromBoard(CommonInfoAddress, function (responceText) {
                console.log(responceText);
                showVendorInfo(JSON.parse(responceText));
            });

            break;
        case 1:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                boardTime = Date.parse(JSON.parse(responceText)['Time']);
                if (document.getElementsByClassName("as1-content__timeSettings").length <= 0) {
                    createTimeView();
                    showTimeSettings();
                }
            });
            break;
        case 2:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                let data = [];
                NetworkSettingsData = JSON.parse(responceText);
                console.log(responceText);
                Object.keys(NetworkSettingsData).forEach(function (item) {
                    data.push(NetworkSettingsData[item]);
                });
                showNetworkSettingsView(data);
            });
            break;
        case 3:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                console.log(responceText);
                let OCPPGeneralData = JSON.parse(responceText);
                parseOCPPGeneralData(OCPPGeneralData);
            });
            break;
        case 4:
            requestDataFromBoard(fileAddress[responceNumber] + keyNumber, function (responceText) {
                console.log(responceText);
                let OCPPKey = JSON.parse(responceText);
                showOCCPKey(OCPPKey);
            });
            break;
        case 5:
            requestDataFromBoard(fileAddress[responceNumber], function (responceText) {
                console.log(responceText);
                let data = [];
                let localList = JSON.parse(responceText);
                Object.keys(localList).forEach(function (item) {
                    data.push(localList[item]);
                });
                showLocalListSettings(data);
            });
            break;
        default:
            break;
    }
}

function showHardwareSettingsView(hardwareSettings) {
    let element = document.querySelector("#section1");
    let info = "";

    info += "<div class=\"as1-content__table as1-content__header as1-content__hardwareSettings\">";
    info += "<div class=\"as1-content__column\">";

    for (let i = 0; i < 3; i++) {
        info += "<div class=\"as1-content__row\">";
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[i] + "</div>";
        info += "<input type=\"text\" class=\"as1-content__settingsInput\" value=\"" + hardwareSettings[i] + "\">";
        info += "</div>";
    }

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[3] + "</div>";
    info += "<select class=\"as1-content__settingsSelect\">";
    for (let i = 0; i < hardwareSettings[3].length; i++) {
        info += "<option value=\"" + i + "\"";
        if (hardwareSettings[4] == i) {
            info += "selected";
        }
        info += ">" + hardwareSettings[3][i] + "</option>";
    }
    info += "</select></div>"

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[4] + "</div>";
    info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" ";
    info += hardwareSettings[5] === true ? 'checked>' : '>';
    info += "</div>";

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[5] + "</div>";
    info += "<select class=\"as1-content__settingsSelect\" onchange=\"updateChannelInputs(this.options[this.selectedIndex].value)\">";
    for (let i = 1; i <= 2; i++) {
        info += "<option value=\"" + i + "\"";
        if (hardwareSettings[6] == i) {
            info += "selected";
        }
        info += ">" + i + "</option>";
    }
    info += "</select></div>"

    info += "<div class=\"as1-content__row as1-content__row_dual\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[6] + "</div>";
    for (let j = 0; j < hardwareSettings[6]; j++) {
        info += "<select class=\"as1-content__settingsSelect\">";
        for (let i = 0; i < phases.length; i++) {
            info += "<option value=\"" + i + "\"";
            if (hardwareSettings[8][j] == i) {
                info += "selected";
            }
            info += ">" + phases[i] + "</option>";
        }
        info += "</select>"
    }
    info += "</div>"

    info += "<div class=\"as1-content__row as1-content__row_dual\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[7] + "</div>";
    for (let i = 0; i < hardwareSettings[6]; i++) {
        info += "<input type=\"text\" class=\"as1-content__settingsInput\" value=\"" + hardwareSettings[7][i] + "\">";
    }
    info += "</div>";

    info += "<div class=\"as1-content__row as1-content__row_dual\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[8] + "</div>";
    for (let i = 0; i < hardwareSettings[6]; i++) {
        info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" ";
        info += hardwareSettings[9][i] === true ? 'checked>' : '>';
    }
    info += "</div>";

    info += "<div class=\"as1-content__row as1-content__row_dual\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + HardwareSettingsTitles[9] + "</div>";
    for (let i = 0; i < hardwareSettings[6]; i++) {
        info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" ";
        info += hardwareSettings[10][i] === true ? 'checked>' : '>';
    }
    info += "</div></div></div>";

    info += "<div class=\"as1-content__emptyRow\"></div>";
    info += "<div class=\"as1-content__buttonRow\">";
    info += "<button class=\"as1-content__button\" onclick=\"updateHardware()\">Update</button>";
    info += "<div class=\"as1-content__warningText\">Warning! After parameters updated, you need to use &#34;Save and reboot&#34; for updates saving.</div>";
    info += "</div>";

    element.innerHTML = info;
}


function showNetworkSettingsView(networkSettings) {
    let element = document.querySelector("#section3");
    let info = "";

    info += "<div class=\"as1-content__table as1-content__header as1-content__networkSettings\">";
    info += "<div class=\"as1-content__column\">";

    for (let i = 0; i < 4; i++) {
        info += "<div class=\"as1-content__row\">";
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + NetworkSettingsTitles[i] + "</div>";
        info += "<input type=\"text\" ";
        info += i != 3 ? " pattern=\"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}$\" " : " ";
        info += " class=\"as1-content__settingsInput\" value=\""
        info += i != 3 ? int2ip(networkSettings[i]) : networkSettings[i];
        info += "\" ";
        info += i != 3 ? '>' : 'disabled>';
        info += "</div>";
    }

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + NetworkSettingsTitles[4] + "</div>";
    info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" onclick=\"disableOCPPserver(this)\"";
    info += networkSettings[4] === true ? 'checked>' : '>';
    info += "</div>";

    info += "<div class=\"as1-content__emptyRow\">" + "ws:\/\/" + int2ip(networkSettings[5]) + ":" + networkSettings[6];
    info += networkSettings[7] + networkSettings[8] + "</div>";

    for (let i = 5; i <= 9; i++) {
        info += "<div class=\"as1-content__row\">";
        info += "<div class=\"as1-content__cell as1-content__cell_title\">" + NetworkSettingsTitles[i] + "</div>";
        info += "<input type=\"text\" onchange=\"updateOCPPString()\" ";
        info += i == 5 ? " pattern=\"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}$\" " : " maxlength=\"63\" ";
        info += " class=\"as1-content__settingsInput as1-content__OCPPServer\" value=\""
        info += i == 5 ? int2ip(networkSettings[i]) : networkSettings[i];
        info += "\" ";
        info += networkSettings[4] === true ? '>' : 'disabled>';
        info += "</div>";
    }

    info += "</div></div>";
    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + NetworkSettingsTitles[10] + "</div>";
    info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" onclick=\"disableUDPport(this)\"";
    info += networkSettings[10] === true ? 'checked>' : '>';
    info += "</div>";
    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">" + NetworkSettingsTitles[11] + "</div>";
    info += "<input type=\"text\" class=\"as1-content__settingsInput as1-content__UDPport\" value=\"" + networkSettings[11] + "\" ";
    info += networkSettings[10] === true ? ">" : "disabled>";
    info += "</div>";

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__buttonRow\">";
    info += "<button class=\"as1-content__button\" onclick=\"updateNetwork()\">Update</button>";
    info += "<div class=\"as1-content__warningText\">Warning! After parameters updated, you need to use &#34;Save and reboot&#34; for updates saving.</div>";
    info += "</div>";
    element.innerHTML = info;
}

function createTimeView() {
    let element = document.querySelector("#section2");
    let info = "";
    info += "<div class=\"as1-content__table as1-content__header as1-content__timeSettings\">";
    info += "<div class=\"as1-content__column\">";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">Reference time</div>";
    info += "<div class=\"as1-content__cell as1-content__cell_data as1-content__browserTime\"></div>";
    info += "</div>";

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">Device time</div>";
    info += "<div class=\"as1-content__cell as1-content__cell_data as1-content__boardTime\"></div>";
    info += "</div></div></div>";

    info += "<div class=\"as1-content__emptyRow\"></div>";

    info += "<div class=\"as1-content__buttonRow\">";
    info += "<button class=\"as1-content__button\" onclick=\"updateTime()\">Update</button>";
    info += "</div>";

    element.innerHTML = info;
}

function updateOCPPString() {
    const settings = getNetworkJson();
    NetworkSettingsData = {...NetworkSettingsData, ...settings};
    let data = [];
    Object.keys(NetworkSettingsData).forEach(function (item) {
        data.push(NetworkSettingsData[item]);
    });
    showNetworkSettingsView(data);
}

function parseOCPPGeneralData(data) {
    let parent = document.querySelector("#section4");
    let button = document.createElement('div');
    parent.innerHTML = "";
    button.className = "as1-content__buttonRow";
    button.innerHTML = "<button class=\"as1-content__button\" onclick=\"updateOCPP()\">Update</button>";
    button.innerHTML += "<div class=\"as1-content__warningText\">Warning! After parameters updated, you need to use &#34;Save and reboot&#34; for updates saving.</div>";
    CSL = {
        M: {
            count: data['CSL_M']['Count'],
            list: data['CSL_M']['List']
        },
        PH: data['CSL_PH']
    };
    for (let i = 0; i < data['Count']; i++) {
        getDataFromBoard(4, i);
    }

    parent.appendChild(button);
}

function showOCCPKey(data) {
    let element = document.querySelector("#section4");
    let key = document.createElement('div');
    key.className = "as1-content__row";

    let info = "";
    info += "<div class=\"as1-content__column\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title as1-content__cell_long\">" + data['Key'] + "</div>";
    info += "</div>";
    switch (data['Type']) {
        case "int":
            info += "<div class=\"as1-content__column\">";
            info += "<input type=\"text\" class=\"as1-content__settingsInput\" value=\"" + data['Value'] + "\"";
            info += data['ReadOnly'] ? "disabled>" : ">";
            info += "</div>";
            break;
        case "csl":
            info += "<div class=\"as1-content__column\">";
            info += "<input type=\"text\" class=\"as1-content__settingsInput\" value=\"" + data['Value'] + "\"";
            info += data['ReadOnly'] ? "disabled>" : ">";
            info += "</div>";
            break;
        case "bool":
            info += "<div class=\"as1-content__column\">";
            info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" ";
            info += data['Value'] === "true" ? ' checked ' : ' ';
            info += data['ReadOnly'] ? "disabled>" : ">";
            info += "</div>";
            break;
        case "csl_m":
            info += showCSL_M(data);
            break;
        case "csl_ph":
            info += showCSL_Ph(data);
            break;
    }
    key.innerHTML = info;
    element.appendChild(key);
}


function showCSL_M(data) {
    let j = 0, info = "";
    let csl_m;

    if (data['Value']) {
        csl_m = data['Value'].split(',');
        const MLength = CSL['M']['list'].length, receivedMLength = csl_m.length;

        info += "<div class=\"as1-content__column\">";
        for (let i = 0; i < receivedMLength; i++) {
            for (j = 0; j < MLength; j++) {
                if (CSL['M']['list'][j]['Meas'] == csl_m[i]) {
                    break;
                }
            }
            if (MLength == j) {
                let strWithoutPhase = csl_m[i].substring(0, csl_m[i].lastIndexOf('.'));
                for (j = 0; j < MLength; j++) {
                    if (CSL['M']['list'][j]['Meas'] == strWithoutPhase) {
                        break;
                    }
                }
            }

            info += "<div class=\"as1-content__row\">";
            if (!CSL['M']['list'][j]['Phases']) {
                info += "<select class=\"as1-content__settingsSelect\" onchange=\"updatePhases(this.nextSibling,this.value)\" ";
                info += data['ReadOnly'] ? "disabled>" : ">";
                for (let k = 0; k < MLength; k++) {
                    info += "<option value=\"" + k + "\"";
                    if (k == j) {
                        info += "selected";
                    }
                    info += ">" + CSL['M']['list'][k]['Meas'] + "</option>";
                }
                info += "</select>";
                info += "<select class=\"as1-content__settingsSelect as1-content__channel-hidden\"></select>";
                info += data['ReadOnly'] ? '' : "<button class=\"as1-content__button_white\" onclick=\"deleteRow(this.parentNode)\"><img src=\"img/delete.png\" alt=\"del\" border=\"0\"></button>";
            } else {
                let phaseStr = csl_m[i].substring(csl_m[i].lastIndexOf('.') + 1);
                let phaseLength = CSL['M']['list'][j]['Phases'].length;

                info += "<select class=\"as1-content__settingsSelect\" onchange=\"updatePhases(this.nextSibling,this.value)\" ";
                info += data['ReadOnly'] ? "disabled>" : ">";
                for (let k = 0; k < MLength; k++) {
                    info += "<option value=\"" + k + "\"";
                    if (k == j) {
                        info += "selected";
                    }
                    info += ">" + CSL['M']['list'][k]['Meas'] + "</option>";
                }
                info += "</select>";

                info += "<select class=\"as1-content__settingsSelect\"";
                info += data['ReadOnly'] ? "disabled>" : ">";

                for (let k = 0; k < phaseLength; k++) {
                    info += "<option value=\"" + k + "\"";
                    if (CSL['M']['list'][j]['Phases'][k] == phaseStr) {
                        info += "selected";
                    }
                    info += ">" + CSL['M']['list'][j]['Phases'][k] + "</option>";
                }
                info += "</select>";
                info += data['ReadOnly'] ? '' : "<button class=\"as1-content__button_white\" onclick=\"deleteRow(this.parentNode)\"><img src=\"img/delete.png\" alt=\"del\" border=\"0\"></button>";
            }
            info += "</div>";
        }
        info += "<div class=\"as1-content__row as1-content__row_center\">";
        info += data['ReadOnly'] ? '' : "<button class=\"as1-content__buttonAdd\" onclick=\"addRow(this.parentNode)\"><img src=\"img/add.png\" alt=\"add\" border=\"0\"></button>";
        info += "</div></div>";
    } else {
        info += "<div class=\"as1-content__column\">";
        info += "<div class=\"as1-content__row as1-content__row_center\">";
        info += data['ReadOnly'] ? '' : "<button class=\"as1-content__buttonAdd\" onclick=\"addRow(this.parentNode)\"><img src=\"img/add.png\" alt=\"add\" border=\"0\"></button>";
        info += "</div></div>";
    }
    return (info);
}

function showCSL_Ph(data) {
    let csl_ph = data['Value'].split(',');
    let info = "";
    const MLength = CSL['PH'].length;
    info += "<div class=\"as1-content__column\">";
    for (let i = 0; i < csl_ph.length; i++) {
        info += "<select class=\"as1-content__settingsSelect\" ";
        info += data['ReadOnly'] ? "disabled>" : ">";

        let strWithoutNumber = csl_ph[i].substring(csl_ph[i].lastIndexOf('.') + 1);
        for (j = 0; j < MLength; j++) {
            if (CSL['PH'][j] == strWithoutNumber) {
                break;
            }
        }

        for (let k = 0; k < MLength; k++) {
            info += "<option value=\"" + k + "\"";
            if (k == j) {
                info += "selected";
            }
            info += ">" + i + '.' + CSL['PH'][k] + "</option>";
        }
        info += "</select>";
    }
    info += "</div>";
    return (info);
}

function showTimeSettings() {
    let boardDate = new Date(boardTime);
    let date = new Date();

    let hours = boardDate.getHours();
    let minutes = boardDate.getMinutes();
    let seconds = boardDate.getSeconds();

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    let ac1Time = hours + ":" + minutes + ":" + seconds;

    hours = date.getHours();
    minutes = date.getMinutes();
    seconds = date.getSeconds();

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    let browserTime = hours + ":" + minutes + ":" + seconds;

    document.getElementsByClassName("as1-content__browserTime")[0].innerHTML = browserTime;
    document.getElementsByClassName("as1-content__boardTime")[0].innerHTML = ac1Time;

    boardTime += 1000;
    setTimeout(showTimeSettings, 1000);
}

function showLocalListSettings(localListSettings) {
    let element = document.querySelector("#section5");
    let info = "";

    for (let i = 0; i < 3; i++) {
        if (i == 2) info += "<div class=\"as1-content__emptyRow\"></div>";
        info += "<div class=\"as1-content__row\">";
        info += "<div class=\"as1-content__cell as1-content__cell_title as1-content__cell_long\">" + localListSettingsTitles[i] + "</div>";
        info += "<input type=\"checkbox\" class=\"as1-content__settingsCheckbox\" ";
        if (i === 2) { info += "onclick=\"disableHardId(this)\""; }
        info += localListSettings[i] === true ? 'checked>' : '>';
        info += "</div>";
    }

    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title as1-content__cell_long\">" + localListSettingsTitles[3] + "</div>";
    info += "<input type=\"text\" class=\"as1-content__settingsInput\" maxlength=\"20\"  value=\"" + localListSettings[3] + "\" ";
    info += localListSettings[2] === true ? ">" : "disabled>";
    info += "</div>";

    info += "<div class=\"as1-content__buttonRow\">";
    info += "<button class=\"as1-content__button\" onclick=\"updateLocalList()\">Update</button>";
    info += "<div class=\"as1-content__warningText\">Warning! After parameters updated, you need to use &#34;Save and reboot&#34; for updates saving.</div>";
    info += "</div>";

    element.innerHTML = info;
}

function updateTime() {
    let now = new Date();
    let currentJSONDate = {
        Time: now.toJSON()
    }

    sendJSONToBoard(JSON.stringify(currentJSONDate), updateAddress[1], function (responceText) {
        alert(responceText);
    });
    getDataFromBoard(1);
}

function getHardwareJson(toFile) {
    let TextSettings = document.querySelectorAll("#section1 .as1-content__settingsInput");
    let SelectSettings = document.querySelectorAll("#section1 .as1-content__settingsSelect");
    let CheckBoxSettings = document.querySelectorAll("#section1 .as1-content__settingsCheckbox");
    let HarwareSettings = {
        Vendor: TextSettings[0].value,
        Model: TextSettings[1].value,
        Serial: TextSettings[2].value,
        RFIDIndex: +SelectSettings[0].value,
        MainMeter: CheckBoxSettings[0].checked,
        ConnAmount: +SelectSettings[1].value,
        Phase: SelectSettings[1].value == 1 ? [+SelectSettings[2].value] : [+SelectSettings[2].value, +SelectSettings[3].value],
        CurLimit: SelectSettings[1].value == 1 ? [+TextSettings[3].value] : [+TextSettings[3].value, +TextSettings[4].value],
        Block: SelectSettings[1].value == 1 ? [CheckBoxSettings[1].checked] : [CheckBoxSettings[1].checked, CheckBoxSettings[2].checked],
        Meter: SelectSettings[1].value == 1 ? [CheckBoxSettings[2].checked] : [CheckBoxSettings[3].checked, CheckBoxSettings[4].checked],
    };
    if (toFile) {
        HarwareSettings['RFIDList'] = [];
        for (let i = 0; i < SelectSettings[0].children.length; i++) {
            HarwareSettings['RFIDList'].push(SelectSettings[0].children[i].innerText);
        }
    }
    return (HarwareSettings);
}

function updateHardware() {
    sendJSONToBoard(JSON.stringify(getHardwareJson(false)), updateAddress[0], function (responceText) {
        alert(responceText);
    });

    getDataFromBoard(0);
}

function getNetworkJson() {
    let TextSettings = document.querySelectorAll("#section3 .as1-content__settingsInput");
    let CheckBoxSettings = document.querySelectorAll("#section3 .as1-content__settingsCheckbox");
    let NetworkSettings = {
        IP: ip2int(TextSettings[0].value),
        Mask: ip2int(TextSettings[1].value),
        Gate: ip2int(TextSettings[2].value),
        OCPPEnable: CheckBoxSettings[0].checked,
        OCPPServer: ip2int(TextSettings[4].value),
        OCPPPort: parseInt(TextSettings[5].value, 10),
        OCPPPath: TextSettings[6].value,
        OCPPID: TextSettings[7].value,
        Timeout: parseInt(TextSettings[8].value),
        udplog: CheckBoxSettings[1].checked,
        udpport: parseInt(TextSettings[9].value)
    };
    return (NetworkSettings);
}

function updateNetwork() {
    sendJSONToBoard(JSON.stringify(getNetworkJson()), updateAddress[2], function (responceText) {
        alert(responceText);
    });
    getDataFromBoard(2);
}

function getOCPPJson(i, keyName, keyValues) {
    let ocppkey = {
        key: "",
        value: ""
    }
    ocppkey['key'] = keyName[i].textContent;
    if (keyValues[i].children.length == 1) {
        if (keyValues[i].firstChild.disabled === true) {
            return (false);
        }
        if (keyValues[i].firstChild.type == "checkbox") {
            ocppkey['value'] = "";
            ocppkey['value'] += keyValues[i].firstChild.checked;
        } else {
            ocppkey['value'] = keyValues[i].firstChild.value;
        }
    } else if (keyValues[i].firstChild.classList.contains("as1-content__row")) {
        let childrenLength;
        if (keyValues[i].lastChild.classList.contains('as1-content__row_center') == false) {
            childrenLength = keyValues[i].children.length;
        } else {
            childrenLength = keyValues[i].children.length - 1;
        }

        if (childrenLength > 0 && keyValues[i].firstChild.firstChild.disabled === true) {
            return (false);
        }

        ocppkey['value'] = "";
        for (let j = 0; j < childrenLength; j++) {
            ocppkey['value'] += CSL['M']['list'][keyValues[i].children[j].firstChild.value]['Meas'];
            if (!keyValues[i].children[j].children[1].classList.contains('as1-content__channel-hidden')) {
                ocppkey['value'] += '.' + CSL['M']['list'][keyValues[i].children[j].firstChild.value]['Phases'][keyValues[i].children[j].children[1].value];
            }
            ocppkey['value'] += j < childrenLength - 1 ? ',' : '';
        }

    } else {
        const childrenLength = keyValues[i].children.length;
        if (childrenLength > 0 && keyValues[i].firstChild.disabled === true) {
            return (false);
        }
        ocppkey['value'] = "";
        for (let j = 0; j < childrenLength; j++) {
            ocppkey['value'] += j + '.' + CSL['PH'][keyValues[i].children[j].value];
            ocppkey['value'] += j < childrenLength - 1 ? ',' : '';
        }
    }

    if (!ocppkey['value']) {
        if (keyValues[i].firstChild.classList.contains('as1-content__row_center') == true && keyValues[i].firstChild.childElementCount == 0) {
            return (false);
        }
        ocppkey['value'] = null;
    }
    return (ocppkey);
}

function updateOCPP() {
    let parent = document.querySelector("#section4");
    let keyName = document.querySelectorAll("#section4 .as1-content__cell_title");
    let keyValues = document.querySelectorAll("#section4 .as1-content__row .as1-content__column:last-child ");
    let updateStatus = [], failureFlag = false;

    for (let i = 0; i < parent.children.length - 1; i++) {
        let ocppKey = getOCPPJson(i, keyName, keyValues);
        if (ocppKey !== false) {
            sendJSONToBoard(JSON.stringify(ocppKey), updateAddress[3], function (responceText) {
                updateStatus.push(ocppKey['key'] + ':' + JSON.parse(responceText)['OK']);
                if (!JSON.parse(responceText)['OK']) {
                    failureFlag = true;
                }
            });
        }
    }
    console.log(updateStatus);
    alert(failureFlag ? "OCPP keys updated with error:\r\n" + updateStatus.filter(status => status.indexOf('false') !== -1).map(item => item += "\r\n").join('') : "OCPP keys updated Succesfully");
    getDataFromBoard(3);
}

function getLocalListJson() {
    let CheckBoxSettings = document.querySelectorAll("#section5 .as1-content__settingsCheckbox");
    let InputSettings = document.querySelectorAll("#section5 .as1-content__settingsInput");
    let NetworkSettings = {
        EnNotOCPP: CheckBoxSettings[0].checked,
        EnAllCard: CheckBoxSettings[1].checked,
        EnHardId: CheckBoxSettings[2].checked,
        HardId: InputSettings[0].value
    };
    return (NetworkSettings);
}

function updateLocalList() {
    sendJSONToBoard(JSON.stringify(getLocalListJson()), updateAddress[5], function (responceText) {
        alert(responceText);
    });
    getDataFromBoard(5);
}

function updateChannelInputs(newChannelAmount) {
    let elements = document.getElementsByClassName("as1-content__row_dual");
    if (newChannelAmount == 1) {
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].children.length > 2) {
                elements[i].children[2].classList.add("as1-content__channel-none");
            }
        }
    }
    else if (newChannelAmount == 2) {
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].children.length > 2) {
                elements[i].children[2].classList.remove("as1-content__channel-none");
            } else {
                if (i == 0) {
                    let secondSelect = document.createElement('select');
                    secondSelect.classList.add("as1-content__settingsSelect");
                    for (let i = 0; i < phases.length; i++) {
                        secondSelect.innerHTML += "<option value=\"" + i + "\">" + phases[i] + "</option>";
                    }
                    elements[i].appendChild(secondSelect);
                }
                else if (i == 1) {
                    let secondInput = document.createElement('input');
                    secondInput.classList.add("as1-content__settingsInput");
                    secondInput.value = "0";
                    elements[i].appendChild(secondInput);
                }
                else if (i == 2) {
                    let secondInput = document.createElement('input');
                    secondInput.type = "checkbox";
                    secondInput.classList.add("as1-content__settingsCheckbox");
                    elements[i].appendChild(secondInput);
                }
                else if (i == 3) {
                    let secondInput = document.createElement('input');
                    secondInput.type = "checkbox";
                    secondInput.classList.add("as1-content__settingsCheckbox");
                    elements[i].appendChild(secondInput);
                }
            }
        }
    }
}

function disableOCPPserver(checkBox) {
    let inputs = document.getElementsByClassName("as1-content__OCPPServer");
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].disabled = checkBox.checked ? false : true;
    }
}

function disableUDPport(checkBox) {
    let inputs = document.getElementsByClassName("as1-content__UDPport");
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].disabled = checkBox.checked ? false : true;
    }
}

function disableHardId(checkBox) {
    let inputs = document.querySelectorAll("#section5 .as1-content__settingsInput");
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].disabled = checkBox.checked ? false : true;
    }
}

function int2ip(ipInt) {
    return ((ipInt & 255) + '.' + (ipInt >> 8 & 255) + '.' + (ipInt >> 16 & 255) + '.' + (ipInt >>> 24));
}

function ip2int(ip) {
    return ip.split('.').reduceRight(function (ipInt, octet) { return (ipInt << 8) + parseInt(octet, 10) }, 0) >>> 0;
}

function saveReboot() {
    let control;
    let result = confirm("AC-1 parameters will be saved and AC-1 will be rebooted!");
    if (result) {
        control = {
            apply: result,
            reboot: result,
            default: false
        }
        sendJSONToBoard(JSON.stringify(control), updateAddress[4], function (responceText) {
            const loader = document.querySelector(".as1-loader");
            loader.classList.remove("as1-loader_hidden");
            setTimeout(checkReboot, 5000);
        });
    } else {
        console.log("error");
    }
}

function reboot() {
    let result = confirm("АС-1 will be rebooted!");
    if (result) {
        control = {
            apply: false,
            reboot: result,
            default: false
        }
        sendJSONToBoard(JSON.stringify(control), updateAddress[4], function (responceText) {
            const loader = document.querySelector(".as1-loader");
            loader.classList.remove("as1-loader_hidden");
            setTimeout(checkReboot, 5000);
        });
    } else {
        console.log("error");
    }
}

function defaultReboot() {
    let result = confirm("AC-1 will make factory reset and AC-1 will be rebooted!");
    if (result) {
        control = {
            apply: false,
            reboot: result,
            default: result
        }
        sendJSONToBoard(JSON.stringify(control), updateAddress[4], function (responceText) {
            const loader = document.querySelector(".as1-loader");
            loader.classList.remove("as1-loader_hidden");
            setTimeout(checkReboot, 5000);
        });
    } else {
        console.log("error");
    }
}

function checkReboot() {
    requestDataFromBoard(CommonInfoAddress, function (responceText) {
        console.log(responceText);
        if (responceText) {
            location.reload();
        } else {
            setTimeout(checkReboot, 3000);
        }
    });
}

function deleteRow(element) {
    let parentElement = element.parentNode;

    if (element.parentNode.children.length == CSL['M']['count'] && element.parentNode.lastChild.classList.contains('as1-content__row_center') == false) {
        let button = document.createElement('div');
        button.className = "as1-content__row as1-content__row_center";
        button.innerHTML = "<button class=\"as1-content__buttonAdd\" onclick=\"addRow(this.parentNode)\"><img src=\"img/add.png\" alt=\"add\" border=\"0\"></button>";
        parentElement.appendChild(button);
    }

    parentElement.removeChild(element);
}

function addRow(element) {
    let newRow = document.createElement('div');
    let info = "";
    const MLength = CSL['M']['list'].length;
    newRow.className = "as1-content__row";
    info += "<select class=\"as1-content__settingsSelect\" onchange=\"updatePhases(this.nextSibling,this.value)\" >";
    for (let k = 0; k < MLength; k++) {
        info += "<option value=\"" + k + "\">" + CSL['M']['list'][k]['Meas'] + "</option>";
    }
    info += "</select>";

    if (!CSL['M']['list'][0]['Phases']) {
        info += "<select class=\"as1-content__settingsSelect as1-content__channel-hidden\"></select>";
    } else {
        const phaseLength = CSL['M']['list'][0]['Phases'].length;
        info += "<select class=\"as1-content__settingsSelect\">";
        for (let i = 0; i < phaseLength; i++) {
            info += "<option value=\"" + i + "\">" + CSL['M']['list'][0]['Phases'][i] + "</option>";
        }
        info += "</select>";
    }

    info += "<button class=\"as1-content__button_white\" onclick=\"deleteRow(this.parentNode)\"><img src=\"img/delete.png\" alt=\"del\" border=\"0\"></button>";
    newRow.innerHTML = info;

    element.parentNode.insertBefore(newRow, element);
    if (element.parentNode.children.length > CSL['M']['count']) {
        element.parentNode.removeChild(element);
    }
}

function updatePhases(element, mValue) {
    element.innerHTML = "";
    if (!CSL['M']['list'][mValue]['Phases']) {
        element.className = "as1-content__settingsSelect as1-content__channel-hidden";
    } else {
        let phaseLength = CSL['M']['list'][mValue]['Phases'].length;
        element.className = "as1-content__settingsSelect";
        for (let i = 0; i < phaseLength; i++) {
            element.innerHTML += "<option value=\"" + i + "\">" + CSL['M']['list'][mValue]['Phases'][i] + "</option>";
        }
    }
}

function exportToJson() {
    let parent = document.querySelector("#section4");
    let keyName = document.querySelectorAll("#section4 .as1-content__cell_title");
    let keyValues = document.querySelectorAll("#section4 .as1-content__row .as1-content__column:last-child ");
    let ocppKey = "";
    let settings = {
        hardware: getHardwareJson(true),
        network: getNetworkJson(),
        ocpp: [],
        locallist: getLocalListJson()
    }
    for (let i = 0; i < parent.children.length - 1; i++) {
        ocppKey = getOCPPJson(i, keyName, keyValues);
        if (ocppKey !== false) {
            settings['ocpp'].push(ocppKey);
        }
    }

    if (window.navigator.msSaveOrOpenBlob) {
        let blob = new Blob([JSON.stringify(settings)]);
        window.navigator.msSaveOrOpenBlob(blob, 'settings.json');
    } else {
        let a = document.createElement('a');
        a.href = 'data:attachment/json,' + encodeURIComponent(JSON.stringify(settings, null, '  '));
        a.target = '_blank';
        a.download = 'settings.json';
        document.body.appendChild(a);
        a.click();
    }
}

function ImportFromJson() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            let settings = "";
            try {
                settings = JSON.parse(readerEvent.target.result);
            } catch (e) {
                alert(e); // error in the above string (in this case, yes)!
            }
            updateHardwareFromFile(settings['hardware']);
            updateHardware();
            updateNetworkFromFile(settings['network']);
            updateNetwork();
            updateLocalListFromFile(settings['locallist']);
            updateLocalList();
            updateOcppKeysFromFile(settings['ocpp']);
        }
    }
    input.click();
}

function updateHardwareFromFile(hardwareJson) {
    updateChannelInputs(hardwareJson['ConnAmount']);
    let TextSettings = document.querySelectorAll("#section1 .as1-content__settingsInput");
    let SelectSettings = document.querySelectorAll("#section1 .as1-content__settingsSelect");
    let CheckBoxSettings = document.querySelectorAll("#section1 .as1-content__settingsCheckbox");
    TextSettings[0].value = hardwareJson['Vendor'];
    TextSettings[1].value = hardwareJson['Model'];
    TextSettings[2].value = hardwareJson['Serial'];
    let rfidList = SelectSettings[0].innerText.split("\n");
    let rfidValue = SelectSettings[0].value;
    for (let i = 0; i < rfidList.length; i++) {
        if (rfidList[i] == hardwareJson['RFIDList'][hardwareJson['RFIDIndex']]) {
            rfidValue = i;
        } else {
            SelectSettings[0][i].selected = false;
        }
    }
    SelectSettings[0][rfidValue].selected = true;
    CheckBoxSettings[0].checked = hardwareJson['MainMeter'];
    SelectSettings[1].value = hardwareJson['ConnAmount'];
    if (hardwareJson['ConnAmount'] == 1) {
        for (let i = 0; i < SelectSettings[2].length; i++) {
            if (i == hardwareJson['Phase'][0]) {
                SelectSettings[2][i].selected = true;
            } else {
                SelectSettings[2][i].selected = false;
            }
        }
        TextSettings[3].value = hardwareJson['CurLimit'][0];
        CheckBoxSettings[1].checked = hardwareJson['Block'][0];
        CheckBoxSettings[2].checked = hardwareJson['Meter'][0];
    } else {
        for (let i = 0; i < SelectSettings[2].length; i++) {
            if (i == hardwareJson['Phase'][0]) {
                SelectSettings[2][i].selected = true;
            } else {
                SelectSettings[2][i].selected = false;
            }
        }
        for (let i = 0; i < SelectSettings[3].length; i++) {
            if (i == hardwareJson['Phase'][1]) {
                SelectSettings[3][i].selected = true;
            } else {
                SelectSettings[3][i].selected = false;
            }
        }
        TextSettings[3].value = hardwareJson['CurLimit'][0];
        TextSettings[4].value = hardwareJson['CurLimit'][1];
        CheckBoxSettings[1].checked = hardwareJson['Block'][0];
        CheckBoxSettings[2].checked = hardwareJson['Block'][1];
        CheckBoxSettings[3].checked = hardwareJson['Meter'][0];
        CheckBoxSettings[4].checked = hardwareJson['Meter'][1];
    }
}

function updateNetworkFromFile(networkJson) {
    let TextSettings = document.querySelectorAll("#section3 .as1-content__settingsInput");
    let CheckBoxSettings = document.querySelectorAll("#section3 .as1-content__settingsCheckbox");
    TextSettings[0].value = int2ip(networkJson['IP']);
    TextSettings[1].value = int2ip(networkJson['Mask']);
    TextSettings[2].value = int2ip(networkJson['Gate']);
    CheckBoxSettings[0].checked = networkJson['OCPPEnable'];
    disableOCPPserver(CheckBoxSettings[0]);
    TextSettings[4].value = int2ip(networkJson['OCPPServer']);
    TextSettings[5].value = networkJson['OCPPPort'];
    TextSettings[6].value = networkJson['OCPPPath'];
    TextSettings[7].value = networkJson['OCPPID'];
    TextSettings[8].value = networkJson['Timeout'];
    CheckBoxSettings[1].checked = networkJson['udplog'];
    TextSettings[9].value = networkJson['udpport'];
}

function updateLocalListFromFile(localListJson) {
    let CheckBoxSettings = document.querySelectorAll("#section5 .as1-content__settingsCheckbox");
    let InputSettings = document.querySelectorAll("#section5 .as1-content__settingsInput");
    CheckBoxSettings[0].checked = localListJson['EnNotOCPP'];
    CheckBoxSettings[1].checked = localListJson['EnAllCard'];
    CheckBoxSettings[2].checked = localListJson['EnHardId'];
    InputSettings[0].value = localListJson['HardId'];
}

function updateOcppKeysFromFile(ocppKeys) {
    let updateStatus = [];
    let failureFlag = "";
    for (let i = 0; i < ocppKeys.length; i++) {
        sendJSONToBoard(JSON.stringify(ocppKeys[i]), updateAddress[3], function (responceText) {
            updateStatus.push(ocppKeys[i]['key'] + ':' + JSON.parse(responceText)['OK']);
            if (!JSON.parse(responceText)['OK']) {
                failureFlag = true;
            }
        });
    }
    console.log(updateStatus);
    alert(failureFlag ? "OCPP keys updated with error:\r\n" + updateStatus.filter(status => status.indexOf('false') !== -1).map(item => item += "\r\n").join('') : "OCPP keys updated Succesfully");
    getDataFromBoard(3);
}