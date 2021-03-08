// const fileAddress = "http://localhost:3939/rfid.cgi";
// const CommonInfoAddress = 'http://localhost:3939/info.cgi';
const fileAddress = "/cgi/rfid.cgi";
const CommonInfoAddress = '/cgi/info.cgi';

function getDataFromBoard() {

    requestDataFromBoard(fileAddress, function (responceText) {
        let rfidData = JSON.parse(responceText);
        console.log(responceText);

        if (document.getElementsByClassName("as1-content__row").length > 0) {
            updateRFIDView(rfidData['RFID']);
            if (rfidData['RFID']) {
                setTimeout(getDataFromBoard, 3000);
            } else {
                setTimeout(getDataFromBoard, 1000);
            }
        } else {
            createRFIDView();
        }
    });
}


function createRFIDView() {
    let element = document.querySelector(".as1-wrap__info");
    let info = "";
    info += "<div class=\"as1-content__row\">";
    info += "<div class=\"as1-content__cell as1-content__cell_title\">RFID</div>";
    info += "<div class=\"as1-content__cell as1-content__cell_data\"></div>";
    info += "</div>";
    element.innerHTML = info;

    requestDataFromBoard(CommonInfoAddress, function (responceText) {
        console.log(responceText);
        showVendorInfo(JSON.parse(responceText));
    });
    getDataFromBoard();
}


function updateRFIDView(rfid) {
    document.getElementsByClassName("as1-content__cell_data")[0].innerHTML = rfid ? rfid : "null";
}